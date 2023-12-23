<template>
  <div>
    <h1>Sign in</h1>
    <button @click="signInWithGoogle">Sign in with Google</button>

    <div v-if="error">
      <p>{{ error }}</p>
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
  methods: {
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();

      try {
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();

        console.log('token', token);

        const response = await axios.post('/auth/google_login/', { token: token });
        // Store your Django backend token and update user state
        localStorage.setItem('userToken', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;
        this.$store.commit('SET_USER_TOKEN', response.data.token);
        this.$store.commit('SET_USER', result.user);
      } catch (error) {
        console.error('Error during backend authentication:', error);
        // Handle errors here
      }
    },
  },
}
</script>
