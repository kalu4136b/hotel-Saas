import { io, Socket } from 'socket.io-client';
import { authStorage } from './api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    return null as any;
  }

  if (!socket) {
    const token = authStorage.getTenantToken() || authStorage.getToken('tenant');
    const property = authStorage.getProperty();

    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: {
        token: token || undefined,
        propertyId: property?.id || undefined,
      },
    });

    socket.on('connect', () => {
      console.log('⚡ [WebSocket] Connected to Server with ID:', socket?.id);
      const currentProperty = authStorage.getProperty();
      if (currentProperty?.id) {
        socket?.emit('join:property', { propertyId: currentProperty.id });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚡ [WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚡ [WebSocket] Connection Notice:', err.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hotel-saas-logout', () => {
    disconnectSocket();
  });
}

/**
 * Play an audible kitchen bell chime using HTML5 Web Audio API synthesis.
 * Does not require external .mp3 files or network assets.
 */
export function playKitchenChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First Bell Tone (High C#6: 1108.73 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1108.73, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second Chime Tone (E6: 1318.51 Hz - harmonic hotel chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.warn('Could not play web audio chime:', err);
  }
}
