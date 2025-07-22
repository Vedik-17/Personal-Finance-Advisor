// Initialize Firebase and set up authentication listener
    useEffect(() => {
        try {
            // Your web app's Firebase configuration
            const firebaseConfig = {
              
                
                // Add ur firebaseConfig
                
            };

            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Sign in anonymously for local development
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