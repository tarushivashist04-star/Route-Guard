require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000', methods: ['GET','POST'], credentials: true } });

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const issueRoutes = require('./routes/issues');
const routeRoutes = require('./routes/routes');
const dashboardRoutes = require('./routes/dashboard');

issueRoutes.setIo(io);
routeRoutes.setIo(io);

app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.url}` }));

const JWT_SECRET = process.env.JWT_SECRET || 'routeguard_ai_secret';
io.use((socket, next) => {
  try { socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET); next(); }
  catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const { role, driver_id, id } = socket.user;
  if (role === 'driver') { socket.join(`driver:${driver_id}`); console.log(`🚛 Driver ${driver_id} connected`); }
  else if (role === 'manager') { socket.join('managers'); console.log(`👔 Manager connected`); }
  socket.emit('connected', { message: 'Connected to RouteGuard AI', role });
  socket.on('disconnect', () => console.log(`Socket disconnected: ${role}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 RouteGuard AI Backend running on port ${PORT}`));
