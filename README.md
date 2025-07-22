Here's a properly formatted and professional **README.md** based on your provided data:

---

💰 Personal Finance Advisor App
A personal finance advisor application built using React and Firebase that helps users track income and expenses, plan monthly budgets, receive smart financial advice, and manage their financial profile. Supports both light and dark themes for a personalized experience.

---

## ✨ Features

* **Dashboard**: View total income, expenses, and net savings. Visualize monthly category-wise spending.
* **Transaction Tracking**: Add income/expense entries with type, category, amount, date, and description.
* **Transaction Deletion**: Remove transactions from your recent history.
* **Budget Planning**: Set monthly budgets for predefined or custom expense categories.
* **Custom Categories**: Add your own categories for more personalized tracking.
* **Financial Advice**: Get smart, rule-based financial advice based on your habits.
* **User Profile**: Save your name for display across the app.
* **Theme Toggle**: Light and dark mode options available.
* **Data Persistence**: All data is securely stored in **Google Firestore**.
* **Anonymous Authentication**: Start using the app immediately—no account creation needed.

---

## 🛠 Technologies Used

* **Frontend**: React.js
* **Styling**: Pure CSS (No Tailwind or external frameworks)
* **Database**: Google Firestore
* **Authentication**: Firebase Authentication (Anonymous)

---

## 🚀 Getting Started

### ✅ Prerequisites

* [Node.js & npm](https://nodejs.org/) installed on your system.

---

### 📦 1. Clone the Repository

```bash
git clone <your-repository-url>
cd personal-finance-advisor-css
```

---

### 📁 2. Install Dependencies

```bash
npm install
```

This will install required packages such as `react`, `react-dom`, and `firebase`.

---

### 🔧 3. Set Up Firebase

#### a. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → Follow the setup steps → Click **Create project**

#### b. Register Web App

1. Inside your Firebase project, click the `</>` icon to register a web app.
2. Give it a nickname (e.g., `My Finance App`)
3. Skip Firebase Hosting
4. Copy the `firebaseConfig` object shown

#### c. Enable Anonymous Authentication

1. Navigate to **Build → Authentication → Sign-in method**
2. Enable **Anonymous** login → Click **Save**

#### d. Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your location → Click **Enable**

#### e. Configure Firestore Security Rules

Go to **Firestore → Rules**, replace contents with:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish** to apply.

---

### 🧠 4. Configure Firebase in React App

Open `src/App.js` and replace this line:

```js
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
```

With your actual Firebase configuration:

```js
const firebaseConfig = {
  apiKey: "AIzaSyCHuiV81jnGpwYMT111xPKTSbXkeob-50g",
  authDomain: "personal-finance-advisor-db109.firebaseapp.com",
  projectId: "personal-finance-advisor-db109",
  storageBucket: "personal-finance-advisor-db109.firebasestorage.app",
  messagingSenderId: "579418738179",
  appId: "1:579418738179:web:addbc1e094a3e702e78836",
  measurementId: "G-D9ZEEZ1Q7C"
};
```

#### Simplify Authentication Logic

Replace the `__initial_auth_token` block with:

```js
signInAnonymously(firebaseAuth)
  .then(() => console.log("Signed in anonymously"))
  .catch(error => console.error("Error signing in anonymously:", error));
```

---

### ▶ 5. Run the App

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

---

## 🧾 Project Structure

```
.
├── public/
│   └── index.html
├── src/
│   ├── App.js         # Main React logic with inline CSS
│   ├── index.js       # React entry point
│   └── ...            # Additional files from Create React App
├── package.json
├── .gitignore
└── README.md          # This file
```

---

## 🔐 Firebase Configuration Security

Firebase `apiKey` is safe to expose in the frontend for Firebase SDK usage. However, for production:

* Use **environment variables** (e.g., `.env`)
* Add `.env` to `.gitignore`
* Replace config values using `process.env.REACT_APP_FIREBASE_API_KEY`, etc.

---

## 🤝 Contributing

Feel free to fork this repo and submit pull requests!

---

## 📄 License

This project is **open source** and free to use.

---
## 🧠 Author

M.Vedik Reddy

Final Year B.Tech — Department of CSE



