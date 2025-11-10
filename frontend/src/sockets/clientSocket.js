import { io } from 'socket.io-client';
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const socket = io(URL);
export default socket;
