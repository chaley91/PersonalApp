// IndexedDB wrapper for meal storage

const DB_NAME = 'CalorieTrackerDB';
const DB_VERSION = 1;
const MEALS_STORE = 'meals';

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
            };
        });
    }

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

    getDateString(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const db = new Database();
