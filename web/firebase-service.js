// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, onSnapshot, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration - users will replace these with their own values
const firebaseConfig = {
    apiKey: localStorage.getItem('firebaseApiKey') || '',
    authDomain: localStorage.getItem('firebaseAuthDomain') || '',
    projectId: localStorage.getItem('firebaseProjectId') || '',
    storageBucket: localStorage.getItem('firebaseStorageBucket') || '',
    messagingSenderId: localStorage.getItem('firebaseMessagingSenderId') || '',
    appId: localStorage.getItem('firebaseAppId') || ''
};

class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.user = null;
        this.initialized = false;
        this.listeners = [];
    }

    // Check if Firebase is configured
    isConfigured() {
        return firebaseConfig.apiKey &&
               firebaseConfig.authDomain &&
               firebaseConfig.projectId;
    }

    // Initialize Firebase
    async initialize() {
        if (!this.isConfigured()) {
            console.log('Firebase not configured');
            return false;
        }

        try {
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);

            // Sign in anonymously
            await signInAnonymously(this.auth);

            // Listen for auth state changes
            onAuthStateChanged(this.auth, (user) => {
                this.user = user;
                if (user) {
                    console.log('User signed in:', user.uid);
                    this.initialized = true;
                }
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    // Save API key to Firestore
    async saveApiKey(apiKey) {
        if (!this.initialized || !this.user) return;

        try {
            const userDoc = doc(this.db, 'users', this.user.uid);
            await setDoc(userDoc, {
                apiKey: apiKey,
                updatedAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.error('Error saving API key:', error);
        }
    }

    // Get API key from Firestore
    async getApiKey() {
        if (!this.initialized || !this.user) return null;

        try {
            const userDoc = doc(this.db, 'users', this.user.uid);
            const docSnap = await getDoc(userDoc);
            if (docSnap.exists()) {
                return docSnap.data().apiKey;
            }
        } catch (error) {
            console.error('Error getting API key:', error);
        }
        return null;
    }

    // Add a meal to Firestore
    async addMeal(meal) {
        if (!this.initialized || !this.user) {
            console.log('Firebase not initialized, meal not synced');
            return null;
        }

        try {
            const mealsRef = collection(this.db, 'users', this.user.uid, 'meals');
            const docRef = await addDoc(mealsRef, {
                ...meal,
                userId: this.user.uid,
                syncedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding meal:', error);
            return null;
        }
    }

    // Get meals for a specific date
    async getMealsByDate(date) {
        if (!this.initialized || !this.user) return [];

        try {
            const dateString = this.getDateString(date);
            const mealsRef = collection(this.db, 'users', this.user.uid, 'meals');
            const q = query(
                mealsRef,
                where('date', '==', dateString),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const meals = [];
            querySnapshot.forEach((doc) => {
                meals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return meals;
        } catch (error) {
            console.error('Error getting meals:', error);
            return [];
        }
    }

    // Get all meals
    async getAllMeals() {
        if (!this.initialized || !this.user) return [];

        try {
            const mealsRef = collection(this.db, 'users', this.user.uid, 'meals');
            const q = query(mealsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const meals = [];
            querySnapshot.forEach((doc) => {
                meals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return meals;
        } catch (error) {
            console.error('Error getting all meals:', error);
            return [];
        }
    }

    // Delete a meal
    async deleteMeal(mealId) {
        if (!this.initialized || !this.user) return false;

        try {
            const mealRef = doc(this.db, 'users', this.user.uid, 'meals', mealId);
            await deleteDoc(mealRef);
            return true;
        } catch (error) {
            console.error('Error deleting meal:', error);
            return false;
        }
    }

    // Listen for real-time updates
    onMealsUpdate(callback) {
        if (!this.initialized || !this.user) return () => {};

        const mealsRef = collection(this.db, 'users', this.user.uid, 'meals');
        const q = query(mealsRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const meals = [];
            snapshot.forEach((doc) => {
                meals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(meals);
        });

        this.listeners.push(unsubscribe);
        return unsubscribe;
    }

    // Cleanup listeners
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }

    getDateString(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const firebaseService = new FirebaseService();
