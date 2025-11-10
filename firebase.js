// Firebase Configuration
// IMPORTANT: Replace these values with your actual Firebase project configuration
// To get your config:
// 1. Go to Firebase Console (https://console.firebase.google.com/)
// 2. Create a new project or select existing project
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" section
// 5. Click on Web app (</>) and copy the configuration

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDj9YCLb3LkhjPESzk_GAXR5WXza7LhnYo",
  authDomain: "hw10bp.firebaseapp.com",
  databaseURL: "https://hw10bp-default-rtdb.firebaseio.com",
  projectId: "hw10bp",
  storageBucket: "hw10bp.firebasestorage.app",
  messagingSenderId: "194663913061",
  appId: "1:194663913061:web:8c001c3193e88b0220188c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();
