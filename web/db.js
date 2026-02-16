// IndexedDB wrapper for meal, weight, and workout storage

const DB_NAME = 'CalorieTrackerDB';
const DB_VERSION = 2;
const MEALS_STORE = 'meals';
const WEIGHTS_STORE = 'weights';
const WORKOUTS_STORE = 'workouts';

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create meals store
                if (!db.objectStoreNames.contains(MEALS_STORE)) {
                    const store = db.createObjectStore(MEALS_STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }

                // Create weights store
                if (!db.objectStoreNames.contains(WEIGHTS_STORE)) {
                    const store = db.createObjectStore(WEIGHTS_STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }

                // Create workouts store
                if (!db.objectStoreNames.contains(WORKOUTS_STORE)) {
                    const store = db.createObjectStore(WORKOUTS_STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    // === Meals ===

    async addMeal(meal) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readwrite');
            const store = transaction.objectStore(MEALS_STORE);

            // Add date string for easy filtering
            const mealWithDate = {
                ...meal,
                date: this.getDateString(meal.timestamp)
            };

            const request = store.add(mealWithDate);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMealsByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readonly');
            const store = transaction.objectStore(MEALS_STORE);
            const index = store.index('date');

            const dateString = this.getDateString(date);
            const request = index.getAll(dateString);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllMeals() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readonly');
            const store = transaction.objectStore(MEALS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentMeals(days = 14) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readonly');
            const store = transaction.objectStore(MEALS_STORE);
            const index = store.index('timestamp');

            // Calculate cutoff date
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const request = index.openCursor(null, 'prev'); // newest first
            const meals = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp >= cutoffTimestamp) {
                        meals.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(meals);
                    }
                } else {
                    resolve(meals);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async deleteMeal(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readwrite');
            const store = transaction.objectStore(MEALS_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllMeals() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([MEALS_STORE], 'readwrite');
            const store = transaction.objectStore(MEALS_STORE);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // === Weights ===

    async addWeight(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WEIGHTS_STORE], 'readwrite');
            const store = transaction.objectStore(WEIGHTS_STORE);

            const entryWithDate = {
                ...entry,
                date: this.getDateString(entry.timestamp)
            };

            const request = store.add(entryWithDate);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getWeightsByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WEIGHTS_STORE], 'readonly');
            const store = transaction.objectStore(WEIGHTS_STORE);
            const index = store.index('date');

            const dateString = this.getDateString(date);
            const request = index.getAll(dateString);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentWeights(days = 30) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WEIGHTS_STORE], 'readonly');
            const store = transaction.objectStore(WEIGHTS_STORE);
            const index = store.index('timestamp');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const request = index.openCursor(null, 'prev');
            const weights = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp >= cutoffTimestamp) {
                        weights.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(weights);
                    }
                } else {
                    resolve(weights);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getAllWeights() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WEIGHTS_STORE], 'readonly');
            const store = transaction.objectStore(WEIGHTS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteWeight(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WEIGHTS_STORE], 'readwrite');
            const store = transaction.objectStore(WEIGHTS_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // === Workouts ===

    async addWorkout(workout) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WORKOUTS_STORE], 'readwrite');
            const store = transaction.objectStore(WORKOUTS_STORE);

            const workoutWithDate = {
                ...workout,
                date: this.getDateString(workout.timestamp)
            };

            const request = store.add(workoutWithDate);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getWorkoutsByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WORKOUTS_STORE], 'readonly');
            const store = transaction.objectStore(WORKOUTS_STORE);
            const index = store.index('date');

            const dateString = this.getDateString(date);
            const request = index.getAll(dateString);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentWorkouts(days = 30) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WORKOUTS_STORE], 'readonly');
            const store = transaction.objectStore(WORKOUTS_STORE);
            const index = store.index('timestamp');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const request = index.openCursor(null, 'prev');
            const workouts = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp >= cutoffTimestamp) {
                        workouts.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(workouts);
                    }
                } else {
                    resolve(workouts);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getAllWorkouts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WORKOUTS_STORE], 'readonly');
            const store = transaction.objectStore(WORKOUTS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteWorkout(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([WORKOUTS_STORE], 'readwrite');
            const store = transaction.objectStore(WORKOUTS_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // === Utility ===

    getDateString(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const db = new Database();
