import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [customCategories, setCustomCategories] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [view, setView] = useState('dashboard');
    const [message, setMessage] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Predefined expense categories
    const predefinedExpenseCategories = ['Groceries', 'Utilities', 'Rent', 'Transport', 'Entertainment', 'Dining Out', 'Healthcare', 'Education', 'Shopping', 'Travel', 'Other'];
    const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];

    // Define appId here to be used consistently for Firestore paths
    // For local development, this will default to 'default-app-id'
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Initialize Firebase and set up authentication listener
    useEffect(() => {
        try {
            // YOUR ACTUAL FIREBASE CONFIGURATION GOES HERE
            const firebaseConfig = {
              apiKey: "AIzaSyCHuiV81jnGpwYMT111xPKTSbXkeob-50g",
              authDomain: "personal-finance-advisor-db109.firebaseapp.com",
              projectId: "personal-finance-advisor-db109",
              storageBucket: "personal-finance-advisor-db109.firebasestorage.app",
              messagingSenderId: "579418738179",
              appId: "1:579418738179:web:addbc1e094a3e702e78836",
              measurementId: "G-D9ZEEZ1Q7C"
            };

            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Simplified authentication for local development: always sign in anonymously
            signInAnonymously(firebaseAuth)
                .then(() => console.log("Signed in anonymously"))
                .catch(error => console.error("Error signing in anonymously:", error));

            const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                }
                setIsAuthReady(true);
            });

            return () => unsubscribeAuth();
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            setMessage("Error: Could not initialize the application. Please try again.");
        }
    }, []);

    // Load dark mode preference from local storage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('isDarkMode');
        if (savedDarkMode !== null) {
            setIsDarkMode(JSON.parse(savedDarkMode));
        }
    }, []);

    // Apply dark mode class to body and save preference to local storage
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
        localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    // Fetch transactions, budgets, user profile, and custom categories
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        // Ensure all Firestore operations are wrapped in a check for db and userId
        // The permission errors are almost certainly due to Firebase Security Rules.
        // The code below is structured correctly for authenticated access.

        const transactionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
        const qTransactions = query(transactionsCollectionRef);

        const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            fetchedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(fetchedTransactions);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            // Provide more specific message for permission errors
            if (error.code === 'permission-denied') {
                setMessage("Error: Permission denied. Please check your Firebase security rules for transactions.");
            } else {
                setMessage("Error: Could not load transactions.");
            }
        });

        const budgetsDocRef = doc(db, `artifacts/${appId}/users/${userId}/budgets`, 'userBudgets');
        const unsubscribeBudgets = onSnapshot(budgetsDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setBudgets(data.budgets || {});
                setCustomCategories(data.customCategories || []);
            } else {
                setBudgets({});
                setCustomCategories([]);
            }
        }, (error) => {
            console.error("Error fetching budgets:", error);
            // Provide more specific message for permission errors
            if (error.code === 'permission-denied') {
                setMessage("Error: Permission denied. Please check your Firebase security rules for budgets.");
            } else {
                setMessage("Error: Could not load budgets.");
            }
        });

        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/userProfile`, 'profileData');
        const unsubscribeUserProfile = onSnapshot(userProfileDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setUserName(docSnapshot.data().name || '');
            } else {
                setUserName('');
            }
        }, (error) => {
            console.error("Error fetching user profile:", error);
            // Provide more specific message for permission errors
            if (error.code === 'permission-denied') {
                setMessage("Error: Permission denied. Please check your Firebase security rules for user profile.");
            } else {
                setMessage("Error: Could not load user profile.");
            }
        });

        return () => {
            unsubscribeTransactions();
            unsubscribeBudgets();
            unsubscribeUserProfile();
        };
    }, [db, userId, isAuthReady, appId]); // Added appId to dependency array

    const showMessage = useCallback((msg, duration = 3000) => {
        setMessage(msg);
        const timer = setTimeout(() => {
            setMessage('');
        }, duration);
        return () => clearTimeout(timer);
    }, []);

    const handleAddTransaction = async (type, category, amount, date, description) => {
        if (!db || !userId) {
            showMessage("Error: Not authenticated. Please try again.");
            return;
        }

        if (!type || !category || !amount || !date) {
            showMessage("Please fill in all required fields (Type, Category, Amount, Date).");
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/transactions`), {
                type,
                category,
                amount: parseFloat(amount),
                date,
                description: description || '',
                timestamp: new Date().toISOString()
            });
            showMessage("Transaction added successfully!");
            setView('dashboard');
        } catch (e) {
            console.error("Error adding document: ", e);
            if (e.code === 'permission-denied') {
                showMessage("Error: Permission denied. Check Firebase security rules for writing transactions.");
            } else {
                showMessage("Error: Could not add transaction.");
            }
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!db || !userId) {
            showMessage("Error: Not authenticated. Please try again.");
            return;
        }

        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId));
            showMessage("Transaction deleted successfully!");
        } catch (e) {
            console.error("Error deleting document: ", e);
            if (e.code === 'permission-denied') {
                showMessage("Error: Permission denied. Check Firebase security rules for deleting transactions.");
            } else {
                showMessage("Error: Could not delete transaction.");
            }
        }
    };

    const handleUpdateBudgets = async (newBudgets) => {
        if (!db || !userId) {
            showMessage("Error: Not authenticated. Please try again.");
            return;
        }

        try {
            const budgetsDocRef = doc(db, `artifacts/${appId}/users/${userId}/budgets`, 'userBudgets');
            await setDoc(budgetsDocRef, { budgets: newBudgets, customCategories: customCategories }, { merge: true });
            showMessage("Budgets updated successfully!");
            setView('dashboard');
        } catch (e) {
            console.error("Error updating budgets: ", e);
            if (e.code === 'permission-denied') {
                showMessage("Error: Permission denied. Check Firebase security rules for updating budgets.");
            } else {
                showMessage("Error: Could not update budgets.");
            }
        }
    };

    const handleAddCustomCategory = async (newCategory) => {
        if (!db || !userId) {
            showMessage("Error: Not authenticated. Please try again.");
            return;
        }
        if (!newCategory || predefinedExpenseCategories.includes(newCategory) || customCategories.includes(newCategory)) {
            showMessage("Invalid or duplicate category name.");
            return;
        }

        try {
            const budgetsDocRef = doc(db, `artifacts/${appId}/users/${userId}/budgets`, 'userBudgets');
            const updatedCustomCategories = [...customCategories, newCategory];
            // Use setDoc with merge: true to create the document if it doesn't exist
            await setDoc(budgetsDocRef, { budgets: budgets, customCategories: updatedCustomCategories }, { merge: true });
            setCustomCategories(updatedCustomCategories);
            showMessage(`Category "${newCategory}" added!`);
        } catch (e) {
            console.error("Error adding custom category: ", e);
            if (e.code === 'permission-denied') {
                showMessage("Error: Permission denied. Check Firebase security rules for adding custom categories.");
            } else {
                showMessage("Error: Could not add custom category.");
            }
        }
    };

    const handleUpdateUserName = async (name) => {
        if (!db || !userId) {
            showMessage("Error: Not authenticated. Please try again.");
            return;
        }

        try {
            const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/userProfile`, 'profileData');
            await setDoc(userProfileDocRef, { name }, { merge: true });
            showMessage("User name updated successfully!");
            setUserName(name);
            setView('dashboard');
        } catch (e) {
            console.error("Error updating user name: ", e);
            if (e.code === 'permission-denied') {
                showMessage("Error: Permission denied. Check Firebase security rules for updating user name.");
            } else {
                showMessage("Error: Could not update user name.");
            }
        }
    };

    const getSummary = useCallback(() => {
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netSavings = totalIncome - totalExpense;

        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlySpendingByCategory = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});

        return { totalIncome, totalExpense, netSavings, monthlySpendingByCategory };
    }, [transactions]);

    const getAdvice = useCallback(() => {
        const { totalIncome, totalExpense, monthlySpendingByCategory } = getSummary();
        const adviceList = [];

        if (totalIncome > 0 && totalExpense / totalIncome > 0.8) {
            adviceList.push("Your expenses are quite high relative to your income. Consider reviewing your spending habits.");
        }

        if (totalIncome > 0 && (totalIncome - totalExpense) / totalIncome < 0.1) {
            adviceList.push("Your savings rate is low. Try to save at least 10-20% of your income each month.");
        }

        for (const category in monthlySpendingByCategory) {
            const spent = monthlySpendingByCategory[category];
            const budgetAmount = budgets[category] ? parseFloat(budgets[category]) : 0;

            if (budgetAmount > 0 && spent > budgetAmount) {
                adviceList.push(`You've exceeded your budget for "${category}" this month. Consider cutting back in this area.`);
            }
        }

        if (adviceList.length === 0) {
            adviceList.push("You're doing great with your finances! Keep up the good work.");
        }

        return adviceList;
    }, [getSummary, budgets]);

    const allExpenseCategories = [...predefinedExpenseCategories, ...customCategories];

    return (
        <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
            <header className="app-header">
                <h1 className="app-title">Personal Finance Advisor</h1>
            </header>

            {message && (
                <div className="message-box">
                    {message}
                </div>
            )}

            <nav className="main-nav">
                <button
                    onClick={() => setView('dashboard')}
                    className={`nav-button ${view === 'dashboard' ? 'active' : ''}`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setView('addTransaction')}
                    className={`nav-button ${view === 'addTransaction' ? 'active' : ''}`}
                >
                    Add Transaction
                </button>
                <button
                    onClick={() => setView('budgetPlanner')}
                    className={`nav-button ${view === 'budgetPlanner' ? 'active' : ''}`}
                >
                    Budget Planner
                </button>
                <button
                    onClick={() => setView('userProfile')}
                    className={`nav-button ${view === 'userProfile' ? 'active' : ''}`}
                >
                    Profile
                </button>
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="nav-button theme-toggle-button"
                >
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
            </nav>

            <main className="main-content">
                {!isAuthReady ? (
                    <div className="loading-message">Loading application...</div>
                ) : (
                    <>
                        {view === 'dashboard' && (
                            <Dashboard
                                summary={getSummary()}
                                advice={getAdvice()}
                                transactions={transactions}
                                userId={userId}
                                handleDeleteTransaction={handleDeleteTransaction}
                                userName={userName}
                                isDarkMode={isDarkMode}
                            />
                        )}
                        {view === 'addTransaction' && (
                            <AddTransactionForm
                                onAddTransaction={handleAddTransaction}
                                onCancel={() => setView('dashboard')}
                                allExpenseCategories={allExpenseCategories}
                                incomeCategories={incomeCategories}
                                isDarkMode={isDarkMode}
                            />
                        )}
                        {view === 'budgetPlanner' && (
                            <BudgetPlanner
                                currentBudgets={budgets}
                                onUpdateBudgets={handleUpdateBudgets}
                                onCancel={() => setView('dashboard')}
                                allExpenseCategories={allExpenseCategories}
                                onAddCustomCategory={handleAddCustomCategory}
                                isDarkMode={isDarkMode}
                            />
                        )}
                        {view === 'userProfile' && (
                            <UserProfile
                                currentUserName={userName}
                                onUpdateUserName={handleUpdateUserName}
                                onCancel={() => setView('dashboard')}
                                isDarkMode={isDarkMode}
                            />
                        )}
                    </>
                )}
            </main>

            <style>
                {`
                /* CSS Variables for Theming */
                :root {
                    --bg-light: #f3f4f6;
                    --text-light: #1f2937;
                    --card-bg-light: #ffffff;
                    --header-bg-light: #2563eb;
                    --header-text-light: #ffffff;
                    --nav-button-bg-light: #ffffff;
                    --nav-button-text-light: #2563eb;
                    --nav-button-hover-light: #eff6ff;
                    --nav-button-active-light: #1d4ed8;
                    --green-light: #d1fae5;
                    --green-text-light: #065f46;
                    --red-light: #fee2e2;
                    --red-text-light: #991b1b;
                    --blue-light: #dbeafe;
                    --blue-text-light: #1e40af;
                    --gray-bg-light: #f9fafb;
                    --gray-text-light: #4b5563;
                    --border-light: #e5e7eb;
                    --input-bg-light: #ffffff;
                    --input-border-light: #d1d5db;

                    --message-box-bg: #3b82f6;
                    --message-box-text: #ffffff;
                }

                .dark-mode:root {
                    --bg-light: #111827;
                    --text-light: #d1d5db;
                    --card-bg-light: #1f2937;
                    --header-bg-light: #1f2937;
                    --header-text-light: #ffffff;
                    --nav-button-bg-light: #374151;
                    --nav-button-text-light: #d1d5db;
                    --nav-button-hover-light: #4b5563;
                    --nav-button-active-light: #1d4ed8; /* Keep blue for active */
                    --green-light: #064e3b;
                    --green-text-light: #a7f3d0;
                    --red-light: #7f1d1d;
                    --red-text-light: #fca5a5;
                    --blue-light: #1e3a8a;
                    --blue-text-light: #93c5fd;
                    --gray-bg-light: #374151;
                    --gray-text-light: #9ca3af;
                    --border-light: #4b5563;
                    --input-bg-light: #374151;
                    --input-border-light: #4b5563;

                    --message-box-bg: #3b82f6; /* Keep same for consistency */
                    --message-box-text: #ffffff;
                }

                /* General Styles */
                body {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                .app-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding-top: 2rem;
                    padding-bottom: 2rem;
                    background-color: var(--bg-light);
                    color: var(--text-light);
                    transition: background-color 0.3s ease, color 0.3s ease;
                }

                .app-header {
                    width: 100%;
                    max-width: 64rem; /* Equivalent to max-w-4xl */
                    padding: 1rem;
                    border-radius: 0.75rem; /* rounded-xl */
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
                    margin-bottom: 2rem;
                    text-align: center;
                    background-color: var(--header-bg-light);
                    color: var(--header-text-light);
                }

                .app-title {
                    font-size: 2.25rem; /* text-4xl */
                    font-weight: 800; /* font-extrabold */
                    letter-spacing: -0.05em; /* tracking-tight */
                }

                .message-box {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    background-color: var(--message-box-bg);
                    color: var(--message-box-text);
                    padding: 0.75rem 1.5rem; /* px-6 py-3 */
                    border-radius: 0.5rem; /* rounded-lg */
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); /* shadow-xl */
                    z-index: 50;
                    animation: fade-in-down 0.5s ease-out forwards;
                }

                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .main-nav {
                    margin-bottom: 2rem;
                    width: 100%;
                    max-width: 64rem; /* max-w-4xl */
                    display: flex;
                    justify-content: center;
                    gap: 1rem; /* space-x-4 */
                    flex-wrap: wrap; /* Allow wrapping on smaller screens */
                }

                .nav-button {
                    padding: 0.75rem 1.5rem; /* px-6 py-3 */
                    border-radius: 9999px; /* rounded-full */
                    font-size: 1.125rem; /* text-lg */
                    font-weight: 600; /* font-semibold */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md */
                    transition: all 0.2s ease;
                    border: none;
                    cursor: pointer;
                    background-color: var(--nav-button-bg-light);
                    color: var(--nav-button-text-light);
                }

                .nav-button:hover {
                    background-color: var(--nav-button-hover-light);
                }

                .nav-button.active {
                    background-color: var(--nav-button-active-light);
                    color: #ffffff;
                }

                /* Specific style for the theme toggle button */
                .theme-toggle-button {
                    padding: 0.5rem 1rem; /* px-4 py-2 */
                    font-size: 1rem; /* text-base */
                    background-color: var(--nav-button-bg-light); /* Default to light mode button bg */
                    color: var(--nav-button-text-light); /* Default to light mode button text */
                }

                .dark-mode .theme-toggle-button {
                    background-color: #f59e0b; /* bg-yellow-500 */
                    color: #1f2937; /* text-gray-900 */
                }

                .dark-mode .theme-toggle-button:hover {
                    background-color: #fbbf24; /* hover:bg-yellow-400 */
                }

                .theme-toggle-button:not(.dark-mode) { /* Specific for light mode state */
                    background-color: #374151; /* bg-gray-700 */
                    color: #ffffff;
                }

                .theme-toggle-button:not(.dark-mode):hover {
                    background-color: #4b5563; /* hover:bg-gray-600 */
                }


                .main-content {
                    width: 100%;
                    max-width: 64rem; /* max-w-4xl */
                    padding-left: 1rem;
                    padding-right: 1rem;
                }

                .loading-message {
                    text-align: center;
                    font-size: 1.125rem; /* text-lg */
                    color: var(--gray-text-light);
                }

                /* Card/Panel Styles */
                .card-panel {
                    padding: 1.5rem;
                    border-radius: 0.75rem; /* rounded-xl */
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
                    width: 100%;
                    max-width: 48rem; /* max-w-md or max-w-4xl for dashboard */
                    margin-left: auto;
                    margin-right: auto;
                    background-color: var(--card-bg-light);
                    color: var(--text-light);
                }

                .card-panel-title {
                    font-size: 1.875rem; /* text-3xl */
                    font-weight: 700; /* font-bold */
                    margin-bottom: 1.5rem;
                    text-align: center;
                    color: var(--text-light);
                }

                /* Dashboard Specifics */
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                @media (min-width: 768px) { /* md: breakpoint */
                    .dashboard-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                .summary-card {
                    padding: 1rem;
                    border-radius: 0.5rem; /* rounded-lg */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md */
                }

                .summary-card h3 {
                    font-size: 1.125rem; /* text-lg */
                    font-weight: 600; /* font-semibold */
                }

                .summary-card p {
                    font-size: 1.5rem; /* text-2xl */
                    font-weight: 700; /* font-bold */
                }

                .summary-income { background-color: var(--green-light); color: var(--green-text-light); }
                .summary-expense { background-color: var(--red-light); color: var(--red-text-light); }
                .summary-savings { background-color: var(--blue-light); color: var(--blue-text-light); }

                .user-id-display {
                    margin-bottom: 1.5rem;
                    text-align: center;
                    font-size: 0.875rem; /* text-sm */
                    color: var(--gray-text-light);
                }

                .user-id-display span {
                    font-family: monospace;
                    background-color: var(--gray-bg-light);
                    padding: 0.25rem;
                    border-radius: 0.25rem;
                }

                .category-list {
                    list-style: none;
                    padding: 0;
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem; /* space-y-2 */
                }

                .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--gray-bg-light);
                    padding: 0.75rem;
                    border-radius: 0.375rem; /* rounded-md */
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                    color: var(--gray-text-light);
                }

                .category-item span:first-child {
                    font-weight: 500; /* font-medium */
                }

                .category-item span:last-child {
                    color: var(--red-text-light);
                    font-weight: 600; /* font-semibold */
                }

                .advice-list {
                    list-style: disc;
                    list-style-position: inside;
                    margin-top: 1rem;
                    padding-left: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem; /* space-y-2 */
                    color: var(--gray-text-light);
                }

                .transaction-table-container {
                    overflow-x-auto;
                }

                .transaction-table {
                    min-width: 100%;
                    background-color: var(--card-bg-light);
                    border-radius: 0.5rem; /* rounded-lg */
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md */
                }

                .transaction-table thead tr {
                    background-color: var(--gray-bg-light);
                    color: var(--gray-text-light);
                    text-transform: uppercase;
                    font-size: 0.875rem; /* text-sm */
                    line-height: 1.25rem; /* leading-normal */
                }

                .transaction-table th, .transaction-table td {
                    padding: 0.75rem 1.5rem; /* py-3 px-6 */
                    text-align: left;
                }

                .transaction-table th:first-child { border-top-left-radius: 0.5rem; }
                .transaction-table th:last-child { border-top-right-radius: 0.5rem; }

                .transaction-table tbody tr {
                    border-bottom: 1px solid var(--border-light);
                    color: var(--gray-text-light);
                    font-size: 0.875rem; /* text-sm */
                    font-weight: 300; /* font-light */
                }

                .transaction-table tbody tr:hover {
                    background-color: var(--gray-bg-light);
                }

                .transaction-type-badge {
                    padding: 0.25rem 0.5rem; /* px-2 py-1 */
                    border-radius: 9999px; /* rounded-full */
                    font-size: 0.75rem; /* text-xs */
                    font-weight: 600; /* font-semibold */
                }

                .transaction-type-badge.income { background-color: #d1fae5; color: #065f46; } /* bg-green-200 text-green-800 */
                .transaction-type-badge.expense { background-color: #fee2e2; color: #991b1b; } /* bg-red-200 text-red-800 */

                .delete-button {
                    background-color: #ef4444; /* bg-red-500 */
                    color: #ffffff;
                    font-weight: 700; /* font-bold */
                    padding: 0.25rem 0.75rem; /* py-1 px-3 */
                    border-radius: 9999px; /* rounded-full */
                    font-size: 0.75rem; /* text-xs */
                    transition: background-color 0.2s ease;
                    border: none;
                    cursor: pointer;
                }

                .delete-button:hover {
                    background-color: #dc2626; /* hover:bg-red-600 */
                }

                /* Form Styles */
                .form-container {
                    padding: 1.5rem;
                    border-radius: 0.75rem; /* rounded-xl */
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
                    width: 100%;
                    max-width: 28rem; /* max-w-md */
                    margin-left: auto;
                    margin-right: auto;
                    background-color: var(--card-bg-light);
                    color: var(--text-light);
                }

                .form-group {
                    margin-bottom: 1rem; /* space-y-4 for overall form */
                }

                .form-label {
                    display: block;
                    font-size: 0.875rem; /* text-sm */
                    font-weight: 500; /* font-medium */
                    margin-bottom: 0.25rem;
                    color: var(--gray-text-light);
                }

                .form-input, .form-select, .form-textarea {
                    margin-top: 0.25rem;
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem; /* px-3 py-2 */
                    border: 1px solid var(--input-border-light);
                    border-radius: 0.375rem; /* rounded-md */
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                    outline: none;
                    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                    background-color: var(--input-bg-light);
                    color: var(--text-light);
                }

                .form-input:focus, .form-select:focus, .form-textarea:focus {
                    border-color: #3b82f6; /* focus:border-blue-500 */
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5); /* focus:ring-blue-500 */
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem; /* space-x-3 */
                }

                .button-base {
                    display: inline-flex;
                    justify-content: center;
                    padding: 0.5rem 1rem; /* py-2 px-4 */
                    border: 1px solid transparent;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                    font-size: 0.875rem; /* text-sm */
                    font-weight: 500; /* font-medium */
                    border-radius: 0.375rem; /* rounded-md */
                    cursor: pointer;
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                    outline: none;
                }

                .button-cancel {
                    color: var(--gray-text-light);
                    background-color: var(--gray-bg-light);
                }

                .button-cancel:hover {
                    background-color: #d1d5db; /* hover:bg-gray-300 */
                }

                .button-primary {
                    color: #ffffff;
                    background-color: #2563eb; /* bg-blue-600 */
                }

                .button-primary:hover {
                    background-color: #1d4ed8; /* hover:bg-blue-700 */
                }

                .button-success {
                    color: #ffffff;
                    background-color: #16a34a; /* bg-green-600 */
                }

                .button-success:hover {
                    background-color: #15803d; /* hover:bg-green-700 */
                }

                /* Budget Planner Specifics */
                .budget-category-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .budget-category-item .form-label {
                    width: 50%;
                }

                .budget-category-item .form-input {
                    width: 50%;
                    text-align: right;
                }

                .add-category-section {
                    border-top: 1px solid var(--border-light);
                    padding-top: 1rem;
                    margin-top: 1rem;
                }

                .add-category-section h3 {
                    font-size: 1.125rem; /* text-lg */
                    font-weight: 600; /* font-semibold */
                    margin-bottom: 0.5rem;
                    color: var(--text-light);
                }

                .add-category-input-group {
                    display: flex;
                    gap: 0.5rem; /* space-x-2 */
                }

                .add-category-input {
                    flex-grow: 1;
                }
                `}
            </style>
        </div>
    );
}

// Component for Dashboard View
const Dashboard = ({ summary, advice, transactions, userId, handleDeleteTransaction, userName, isDarkMode }) => (
    <div className="card-panel">
        <h2 className="card-panel-title">Financial Overview</h2>

        {userName && (
            <p className={`text-xl font-semibold mb-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Welcome, {userName}!</p>
        )}

        {userId && (
            <div className="user-id-display">
                <p>Your User ID: <span className="user-id-span">{userId}</span></p>
            </div>
        )}

        <div className="dashboard-grid">
            <div className="summary-card summary-income">
                <h3>Total Income</h3>
                <p>${summary.totalIncome.toFixed(2)}</p>
            </div>
            <div className="summary-card summary-expense">
                <h3>Total Expenses</h3>
                <p>${summary.totalExpense.toFixed(2)}</p>
            </div>
            <div className="summary-card summary-savings">
                <h3>Net Savings</h3>
                <p>${summary.netSavings.toFixed(2)}</p>
            </div>
        </div>

        <div className="mb-8">
            <h3 className="card-panel-title">Current Month Spending by Category</h3>
            {Object.keys(summary.monthlySpendingByCategory).length > 0 ? (
                <ul className="category-list">
                    {Object.entries(summary.monthlySpendingByCategory).map(([category, amount]) => (
                        <li key={category} className="category-item">
                            <span>{category}</span>
                            <span>${amount.toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="loading-message">No expenses recorded for the current month yet.</p>
            )}
        </div>

        <div className="mb-8">
            <h3 className="card-panel-title">Financial Advice</h3>
            <ul className="advice-list">
                {advice.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
        </div>

        <div>
            <h3 className="card-panel-title">Recent Transactions</h3>
            {transactions.length > 0 ? (
                <div className="transaction-table-container">
                    <table className="transaction-table">
                        <thead><tr>
                                <th className="py-3 px-6 text-left rounded-tl-lg">Date</th>
                                <th className="py-3 px-6 text-left">Type</th>
                                <th className="py-3 px-6 text-left">Category</th>
                                <th className="py-3 px-6 text-right">Amount</th>
                                <th className="py-3 px-6 text-left">Description</th>
                                <th className="py-3 px-6 text-center rounded-tr-lg">Actions</th>
                            </tr></thead>
                        <tbody>{transactions.slice(0, 5).map(t => (
                                <tr key={t.id}>
                                    <td className="py-3 px-6 text-left whitespace-nowrap">{t.date}</td>
                                    <td className="py-3 px-6 text-left">
                                        <span className={`transaction-type-badge ${t.type}`}>
                                            {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-left">{t.category}</td>
                                    <td className="py-3 px-6 text-right">${t.amount.toFixed(2)}</td>
                                    <td className="py-3 px-6 text-left">{t.description || '-'}</td>
                                    <td className="py-3 px-6 text-center">
                                        <button
                                            onClick={() => handleDeleteTransaction(t.id)}
                                            className="delete-button"
                                            title="Delete Transaction"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}</tbody>
                    </table>
                </div>
            ) : (
                <p className="loading-message">No transactions recorded yet. Add some to get started!</p>
            )}
        </div>
    </div>
);

// Component for Add Transaction View
const AddTransactionForm = ({ onAddTransaction, onCancel, allExpenseCategories, incomeCategories, isDarkMode }) => {
    const [type, setType] = useState('expense');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddTransaction(type, category, amount, date, description);
    };

    return (
        <div className="form-container">
            <h2 className="card-panel-title">Add New Transaction</h2>
            <form onSubmit={handleSubmit} className="form-content">
                <div className="form-group">
                    <label htmlFor="type" className="form-label">Transaction Type</label>
                    <select
                        id="type"
                        value={type}
                        onChange={(e) => { setType(e.target.value); setCategory(''); }}
                        className="form-select"
                    >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="category" className="form-label">Category</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="form-select"
                        required
                    >
                        <option value="">Select a category</option>
                        {(type === 'expense' ? allExpenseCategories : incomeCategories).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="amount" className="form-label">Amount ($)</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="form-input"
                        step="0.01"
                        min="0"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="date" className="form-label">Date</label>
                    <input
                        type="date"
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description" className="form-label">Description (Optional)</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        className="form-textarea"
                    ></textarea>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="button-base button-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="button-base button-primary"
                    >
                        Add Transaction
                    </button>
                </div>
            </form>
        </div>
    );
};

// Component for Budget Planner View
const BudgetPlanner = ({ currentBudgets, onUpdateBudgets, onCancel, allExpenseCategories, onAddCustomCategory, isDarkMode }) => {
    const [tempBudgets, setTempBudgets] = useState(currentBudgets || {});
    const [newCategoryName, setNewCategoryName] = useState('');

    const handleBudgetChange = (category, value) => {
        setTempBudgets(prev => ({
            ...prev,
            [category]: value
        }));
    };

    const handleAddCategoryClick = () => {
        if (newCategoryName.trim()) {
            onAddCustomCategory(newCategoryName.trim());
            setNewCategoryName('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const filteredBudgets = Object.fromEntries(
            Object.entries(tempBudgets).filter(([key, value]) => parseFloat(value) > 0)
        );
        onUpdateBudgets(filteredBudgets);
    };

    return (
        <div className="form-container">
            <h2 className="card-panel-title">Set Monthly Budgets</h2>
            <form onSubmit={handleSubmit} className="form-content">
                {allExpenseCategories.map(category => (
                    <div key={category} className="budget-category-item form-group">
                        <label htmlFor={`budget-${category}`} className="form-label">
                            {category} Budget ($)
                        </label>
                        <input
                            type="number"
                            id={`budget-${category}`}
                            value={tempBudgets[category] || ''}
                            onChange={(e) => handleBudgetChange(category, e.target.value)}
                            className="form-input"
                            step="0.01"
                            min="0"
                        />
                    </div>
                ))}
                <div className="add-category-section">
                    <h3>Add New Category</h3>
                    <div className="add-category-input-group">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Hobbies, Subscriptions"
                            className="form-input add-category-input"
                        />
                        <button
                            type="button"
                            onClick={handleAddCategoryClick}
                            className="button-base button-success"
                        >
                            Add +
                        </button>
                    </div>
                </div>
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="button-base button-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="button-base button-primary"
                    >
                        Save Budgets
                    </button>
                </div>
            </form>
        </div>
    );
};

// Component for User Profile View
const UserProfile = ({ currentUserName, onUpdateUserName, onCancel, isDarkMode }) => {
    const [tempUserName, setTempUserName] = useState(currentUserName);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdateUserName(tempUserName);
    };

    return (
        <div className="form-container">
            <h2 className="card-panel-title">Your Profile</h2>
            <form onSubmit={handleSubmit} className="form-content">
                <div className="form-group">
                    <label htmlFor="userName" className="form-label">Your Name</label>
                    <input
                        type="text"
                        id="userName"
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        className="form-input"
                        placeholder="Enter your name"
                    />
                </div>
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="button-base button-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="button-base button-primary"
                    >
                        Save Name
                    </button>
                </div>
            </form>
        </div>
    );
};

export default App;
