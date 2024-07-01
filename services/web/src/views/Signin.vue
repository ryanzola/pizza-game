<template>
    <div class="min-h-[calc(100vh-88px)] min-w-full flex items-center justify-center">
      <div class="mx-auto max-w-md p-6 space-y-6">
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold text-white">Pizza 🥭</h1>
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
      this.$router.push('/');
    }
  },
  methods: {
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();

      try {
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();

        const { data } = await axios.post('/auth/google_login/', { token: token });

        this.$store.commit('SET_USER', data.user);
        this.$store.commit('SET_USER_TOKEN', data.token);
        localStorage.setItem('userToken', data.token);
        axios.defaults.headers.common['Authorization'] = `Token ${data.token}`;

        this.$router.push('/');
      } catch (error) {
        console.error('Error during authentication:', error);
        // Handle errors here
      }
    },
  },
}
</script>
