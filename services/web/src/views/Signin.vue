<template>
    <div class="min-h-screen min-w-full flex items-center justify-center">
      <div class="mx-auto max-w-md p-6 space-y-6">
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold text-white">Pizza Mango 🥭</h1>
          <p class="text-gray-500 dark:text-gray-400">Sign in with your Google account</p>
        </div>
        <div class="flex flex-col gap-4">
          <button class="w-full flex justify-center items-center bg-[#d0021b] text-white" @click="signInWithGoogle">
            <img class="w-5 h-5 mr-2" src="../assets/google.svg" alt="">
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
</template>

<script>
import axios from 'axios'
import { mapState } from 'vuex'
import auth from '../firebase/init'
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export default {
  name: 'SignIn',
  mounted() {

  },
  data() {
    return {
      error: null
    }
  },
  computed: {
    ...mapState(['user'])
  },
  mounted() {
    if (this.user && this.user.token) {
      this.$router.push('/home');
    }
  },
  methods: {
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();

      try {
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();

        const response = await axios.post('/auth/google_login/', { token: token });

        const user = {
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          email: result.user.email,
          uid: result.user.uid,
          profile: response.data.profile,
          token: response.data.token
        }

        this.$store.commit('SET_USER', user);
        this.$store.commit('SET_USER_TOKEN', response.data.token);
        localStorage.setItem('userToken', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;

        this.$router.push('/home');
      } catch (error) {
        console.error('Error during backend authentication:', error);
        // Handle errors here
      }
    },
  },
}
</script>
