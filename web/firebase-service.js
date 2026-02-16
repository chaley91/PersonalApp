// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, onSnapshot, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration - hard-coded for convenience
const firebaseConfig = {
    apiKey: "AIzaSyCFWda9gZhuGpwhuknBUcOJ_Q0J8nMph-g",
    authDomain: "calorietracker-87cdb.firebaseapp.com",
    projectId: "calorietracker-87cdb",
    storageBucket: "calorietracker-87cdb.firebasestorage.app",
    messagingSenderId: "271472354686",
    appId: "1:271472354686:web:a1d96a40f5f13f967c3f2f",
    measurementId: "G-6W7TBQDMYM"
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

            // Wait for initial auth state to be restored from localStorage
            await new Promise((resolve) => {
                let isFirstCall = true;
                onAuthStateChanged(this.auth, (user) => {
                    this.user = user;
                    if (user) {
                        console.log('User signed in:', user.email || user.uid);
                        this.initialized = true;
                    } else {
                        console.log('User signed out');
                        this.initialized = false;
                    }

                    // Resolve on first call (initial auth state determined)
                    if (isFirstCall) {
                        isFirstCall = false;
                        resolve();
                    }
                });
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    // Sign up with email and password
    async signUp(email, password) {
        if (!this.auth) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            this.user = userCredential.user;
            this.initialized = true;
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        if (!this.auth) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            this.user = userCredential.user;
            this.initialized = true;
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Sign out
    async signOutUser() {
        if (!this.auth) return;

        try {
            await signOut(this.auth);
            this.user = null;
            this.initialized = false;
            this.cleanup();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    // Get user-friendly error messages
    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please sign in instead.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            default:
                return error.message || 'Authentication failed. Please try again.';
        }
    }

    // Check if user is signed in
    isSignedIn() {
        return this.initialized && this.user !== null;
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
                date: meal.date || this.getDateString(meal.timestamp), // Add date field for querying
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

    // Get recent meals (last N days)
    async getRecentMeals(days = 14) {
        if (!this.initialized || !this.user) return [];

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const mealsRef = collection(this.db, 'users', this.user.uid, 'meals');
            const q = query(mealsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const meals = [];
            querySnapshot.forEach((doc) => {
                const mealData = doc.data();
                if (mealData.timestamp >= cutoffTimestamp) {
                    meals.push({
                        id: doc.id,
                        ...mealData
                    });
                }
            });
            return meals;
        } catch (error) {
            console.error('Error getting recent meals:', error);
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

    // === Weights ===

    async addWeight(entry) {
        if (!this.initialized || !this.user) return null;

        try {
            const weightsRef = collection(this.db, 'users', this.user.uid, 'weights');
            const docRef = await addDoc(weightsRef, {
                ...entry,
                date: entry.date || this.getDateString(entry.timestamp),
                userId: this.user.uid,
                syncedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding weight:', error);
            return null;
        }
    }

    async getWeightsByDate(date) {
        if (!this.initialized || !this.user) return [];

        try {
            const dateString = this.getDateString(date);
            const weightsRef = collection(this.db, 'users', this.user.uid, 'weights');
            const q = query(
                weightsRef,
                where('date', '==', dateString),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const weights = [];
            querySnapshot.forEach((doc) => {
                weights.push({ id: doc.id, ...doc.data() });
            });
            return weights;
        } catch (error) {
            console.error('Error getting weights:', error);
            return [];
        }
    }

    async getRecentWeights(days = 30) {
        if (!this.initialized || !this.user) return [];

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const weightsRef = collection(this.db, 'users', this.user.uid, 'weights');
            const q = query(weightsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const weights = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.timestamp >= cutoffTimestamp) {
                    weights.push({ id: doc.id, ...data });
                }
            });
            return weights;
        } catch (error) {
            console.error('Error getting recent weights:', error);
            return [];
        }
    }

    async getAllWeights() {
        if (!this.initialized || !this.user) return [];

        try {
            const weightsRef = collection(this.db, 'users', this.user.uid, 'weights');
            const q = query(weightsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const weights = [];
            querySnapshot.forEach((doc) => {
                weights.push({ id: doc.id, ...doc.data() });
            });
            return weights;
        } catch (error) {
            console.error('Error getting all weights:', error);
            return [];
        }
    }

    async deleteWeight(weightId) {
        if (!this.initialized || !this.user) return false;

        try {
            const weightRef = doc(this.db, 'users', this.user.uid, 'weights', weightId);
            await deleteDoc(weightRef);
            return true;
        } catch (error) {
            console.error('Error deleting weight:', error);
            return false;
        }
    }

    // === Workouts ===

    async addWorkout(workout) {
        if (!this.initialized || !this.user) return null;

        try {
            const workoutsRef = collection(this.db, 'users', this.user.uid, 'workouts');
            const docRef = await addDoc(workoutsRef, {
                ...workout,
                date: workout.date || this.getDateString(workout.timestamp),
                userId: this.user.uid,
                syncedAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding workout:', error);
            return null;
        }
    }

    async getWorkoutsByDate(date) {
        if (!this.initialized || !this.user) return [];

        try {
            const dateString = this.getDateString(date);
            const workoutsRef = collection(this.db, 'users', this.user.uid, 'workouts');
            const q = query(
                workoutsRef,
                where('date', '==', dateString),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const workouts = [];
            querySnapshot.forEach((doc) => {
                workouts.push({ id: doc.id, ...doc.data() });
            });
            return workouts;
        } catch (error) {
            console.error('Error getting workouts:', error);
            return [];
        }
    }

    async getRecentWorkouts(days = 30) {
        if (!this.initialized || !this.user) return [];

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffTimestamp = cutoffDate.getTime();

            const workoutsRef = collection(this.db, 'users', this.user.uid, 'workouts');
            const q = query(workoutsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const workouts = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.timestamp >= cutoffTimestamp) {
                    workouts.push({ id: doc.id, ...data });
                }
            });
            return workouts;
        } catch (error) {
            console.error('Error getting recent workouts:', error);
            return [];
        }
    }

    async getAllWorkouts() {
        if (!this.initialized || !this.user) return [];

        try {
            const workoutsRef = collection(this.db, 'users', this.user.uid, 'workouts');
            const q = query(workoutsRef, orderBy('timestamp', 'desc'));

            const querySnapshot = await getDocs(q);
            const workouts = [];
            querySnapshot.forEach((doc) => {
                workouts.push({ id: doc.id, ...doc.data() });
            });
            return workouts;
        } catch (error) {
            console.error('Error getting all workouts:', error);
            return [];
        }
    }

    async deleteWorkout(workoutId) {
        if (!this.initialized || !this.user) return false;

        try {
            const workoutRef = doc(this.db, 'users', this.user.uid, 'workouts', workoutId);
            await deleteDoc(workoutRef);
            return true;
        } catch (error) {
            console.error('Error deleting workout:', error);
            return false;
        }
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
