/**
 * fittrack-db.js  –  Shared localStorage "database" for FitTrack
 *
 * HOW IT MAPS TO YOUR SQL SCHEMA
 * ─────────────────────────────────────────────────────────────
 *  SQL TABLE          localStorage KEY                   What's stored
 *  ──────────────     ──────────────────────────────     ─────────────────────────────────
 *  users              fittrack_session                   Logged-in user object (id, name, role…)
 *  meals              fittrack_meals_{userId}            Array of meal objects (per-user)
 *  bmi_records        fittrack_bmi_records_{userId}      Array of BMI snapshots (per-user)
 *  weight_logs        fittrack_weightlog_{userId}        Array of weight entries (per-user)
 *  workout_history    fittrack_workouts_{userId}         Array of completed workouts
 *  workout_suggestions fittrack_workouts_global         Array of trainer suggestions
 *
 * Every function that WRITES data fires a custom "fittrack:update" event
 * so any open page (dashboard, nutrition, progress) can react instantly.
 */

const FitTrackDB = (() => {

  // ── helpers ────────────────────────────────────────────────
  const read  = key       => JSON.parse(localStorage.getItem(key) || "null");
  const write = (key, v)  => { localStorage.setItem(key, JSON.stringify(v)); _emit(key); };
  const _emit = key       => window.dispatchEvent(new CustomEvent("fittrack:update", { detail: { key } }));

  // ── session ────────────────────────────────────────────────
  const getSession  = ()  => read("fittrack_session");
  const saveSession = (s) => write("fittrack_session", s);
  const logout      = ()  => {
    localStorage.removeItem("fittrack_session");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "index.html";
  };
  const requireClient = () => {
    const s = getSession();
    if (!s || s.role !== "client") window.location.href = "index.html";
    return s;
  };

  // ── meals (nutrition.html) ─────────────────────────────────
  const mealsKey    = uid => `fittrack_meals_${uid}`;
  const getMeals    = uid => read(mealsKey(uid)) || [];
  const addMeal     = (uid, meal) => {
    const meals = getMeals(uid);
    meals.push({ ...meal, id: Date.now(), logged_date: new Date().toISOString().split("T")[0] });
    write(mealsKey(uid), meals);
    _recalcDailyTotals(uid);
  };
  const deleteMeal  = (uid, mealId) => {
    write(mealsKey(uid), getMeals(uid).filter(m => m.id !== mealId));
    _recalcDailyTotals(uid);
  };
  const getTodayMeals = uid => {
    const today = new Date().toISOString().split("T")[0];
    return getMeals(uid).filter(m => m.logged_date === today);
  };

  // ── daily totals cache (read by dashboard) ─────────────────
  const totalsKey      = uid => `fittrack_totals_${uid}`;
  const getDailyTotals = uid => read(totalsKey(uid)) || { calories:0, protein:0, carbs:0, fats:0, goal:2500 };
  const _recalcDailyTotals = uid => {
    const todayMeals = getTodayMeals(uid);
    const totals = todayMeals.reduce((acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fats:     acc.fats     + (m.fats     || 0),
    }), { calories:0, protein:0, carbs:0, fats:0 });
    totals.goal = read(totalsKey(uid))?.goal || 2500;
    write(totalsKey(uid), totals);
  };

  // ── BMI records (bmi-calculator.html) ─────────────────────
  const bmiKey     = uid => `fittrack_bmi_records_${uid}`;
  const getBmiLog  = uid => read(bmiKey(uid)) || [];
  const saveBmi    = (uid, { height_cm, weight_kg, bmi, category }) => {
    const log = getBmiLog(uid);
    log.unshift({ id: Date.now(), height_cm, weight_kg, bmi, category,
                  recorded_at: new Date().toISOString() });
    write(bmiKey(uid), log);
    // also update weight log so progress page sees it
    addWeight(uid, weight_kg, "from BMI entry");
    // cache latest bmi for dashboard
    write(`fittrack_bmi_latest_${uid}`, { bmi, category });
  };
  const getLatestBmi = uid => read(`fittrack_bmi_latest_${uid}`);

  // ── weight log (progress.html) ─────────────────────────────
  const weightKey    = uid => `fittrack_weightlog_${uid}`;
  const getWeightLog = uid => read(weightKey(uid)) || [];
  const addWeight    = (uid, kg, notes = "") => {
    const log = getWeightLog(uid);
    const dateStr = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
    // avoid duplicate same-day entry from BMI save
    if (log.length && log[0].date === dateStr && log[0].kg === kg) return;
    log.unshift({ id: Date.now(), kg, notes, date: dateStr, ts: Date.now() });
    write(weightKey(uid), log);
    // cache latest weight for dashboard
    const change = log.length >= 2 ? (kg - log[log.length-1].kg).toFixed(1) : null;
    write(`fittrack_weight_latest_${uid}`, { kg, change });
  };
  const getLatestWeight = uid => read(`fittrack_weight_latest_${uid}`);

  // ── weekly calories burned (workout_history) ───────────────
  const histKey        = uid => `fittrack_workouts_${uid}`;
  const getWorkoutHist = uid => read(histKey(uid)) || [];
  const logWorkout     = (uid, entry) => {
    const hist = getWorkoutHist(uid);
    hist.unshift({ ...entry, id: Date.now(), performed_at: new Date().toISOString() });
    write(histKey(uid), hist);
    _recalcWeeklyBurn(uid);
  };
  const weeklyBurnKey   = uid => `fittrack_weekly_burn_${uid}`;
  const getWeeklyBurn   = uid => read(weeklyBurnKey(uid)) || { total:0, byDay:[0,0,0,0,0,0,0], byDayDuration:[0,0,0,0,0,0,0] };
  const _recalcWeeklyBurn = uid => {
    const hist  = getWorkoutHist(uid);
    const now   = Date.now();
    const week  = hist.filter(w => now - new Date(w.performed_at).getTime() < 7*24*3600*1000);
    const byDay = [0,0,0,0,0,0,0];  // Mon=0 … Sun=6
    const byDur = [0,0,0,0,0,0,0];
    week.forEach(w => {
      const d = new Date(w.performed_at).getDay(); // 0=Sun
      const idx = d === 0 ? 6 : d - 1;
      byDay[idx] += w.calories_burned || 0;
      byDur[idx] += w.duration_min    || 0;
    });
    write(weeklyBurnKey(uid), { total: byDay.reduce((a,b)=>a+b,0), byDay, byDayDuration: byDur });
  };

  // ── public API ─────────────────────────────────────────────
  return {
    getSession, saveSession, logout, requireClient,
    getMeals, addMeal, deleteMeal, getTodayMeals,
    getDailyTotals, _recalcDailyTotals,
    getBmiLog, saveBmi, getLatestBmi,
    getWeightLog, addWeight, getLatestWeight,
    getWorkoutHist, logWorkout, getWeeklyBurn,
  };
})();

// Make available globally
window.FitTrackDB = FitTrackDB;
