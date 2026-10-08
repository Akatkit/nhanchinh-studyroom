import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        choose: 'choose.html',
        rooms: 'rooms.html',
        room: 'room.html',
      },
    },
  },
})