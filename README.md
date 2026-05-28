# K-PONG

A modern take on the classic Pong game with multiplayer support, ranking system, and retro vibes!

<img src="screenshots/k-pong-game.png" width="45%" alt="In game screenshot">&nbsp;
<img src="screenshots/k-pong-won.png" width="45%" alt="End game screenshot">

## Features
- Real-time multiplayer gameplay
- ELO ranking system
- Retro-style graphics with modern smoothing
- Original 80's inspired soundtrack
- Genome based, procedural music track
- Match history and statistics
- Random player matchmaking

## Prerequisites
- Docker
- Docker Compose

## Fly.io deployment

Three apps are used in production:

| App | URL |
|-----|-----|
| Frontend | `https://k-pong.fly.dev` |
| Backend | `https://k-pong-backend.fly.dev` |
| Player service | `k-pong-player-service.internal:5001` (private) |

The frontend must call the **backend** URL, not itself. Set `REACT_APP_BACKEND_URL=https://k-pong-backend.fly.dev` on the frontend app (see `frontend/fly.toml`).

Redeploy after config changes:

```bash
fly deploy --config frontend/fly.toml
fly deploy --config backend/fly.toml
fly deploy --config player-service/fly.toml
```

## Getting Started

1. Clone the repository:
bash
git clone https://github.com/escapeSeq/k-pong.git
cd k-pong

2. Start the application:

bash
docker-compose up --build

3. Open your browser and navigate to:

http://localhost:3000

## Gameplay

1. Welcome screen:
- Enter your name and start the game

2. Gameplay:

- Use up and down arrow keys, or mouse, to move the paddle
- Try to hit the ball past your opponent's paddle
- First to score 5 points wins

3. Game Over:

- See your final score and rank
- View match history and statistics

## Technologies Used

- React
- Node.js
- Express
- Socket.io
- Docker
- Docker Compose

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes and commit them
4. Push to your fork
5. Create a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.


