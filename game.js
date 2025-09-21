// Game client for MMORPG
class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = new Image();
        this.worldSize = 2048; // World map is 2048x2048 pixels
        
        // WebSocket connection
        this.socket = null;
        this.connected = false;
        
        // Player data
        this.myPlayerId = null;
        this.myPosition = { x: 0, y: 0 };
        this.players = new Map(); // playerId -> player data
        this.avatars = new Map(); // avatarName -> avatar data
        
        // Viewport
        this.viewport = { x: 0, y: 0 };
        
        // Movement
        this.pressedKeys = new Set();
        this.isMoving = false;
        
        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 200; // milliseconds per frame
        this.lastAnimationTime = 0;
        
        // Greeting messages
        this.greetingMessages = [
            "Hi! 😊",
            "Hola! 😄", 
            "Bonjour! 😃",
            "Ciao! 😁",
            "こんにちは! 😊",
            "你好! 😄",
            "Привет! 😃",
            "안녕하세요! 😁",
            "Hallo! 😊",
            "Salut! 😄",
            "Hej! 😃",
            "Привіт! 😁"
        ];
        this.currentGreetingIndex = 0;
        this.greetingTimer = 0;
        this.greetingInterval = 5000; // 5 seconds
        this.showGreeting = false;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.loadWorldMap();
        this.setupKeyboardControls();
        this.connectToServer();
        this.startAnimationLoop();
    }
    
    setupCanvas() {
        // Set canvas size to fill the browser window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.updateViewport();
            this.draw();
        });
    }
    
    loadWorldMap() {
        this.worldImage.onload = () => {
            this.draw();
        };
        
        this.worldImage.onerror = () => {
            console.error('Failed to load world map image');
            this.drawPlaceholder();
        };
        
        // Load the world map image
        this.worldImage.src = 'world.jpg';
    }
    
    setupKeyboardControls() {
        // Handle keydown events
        document.addEventListener('keydown', (event) => {
            console.log('Key pressed:', event.key, 'Connected:', this.connected);
            
            if (!this.connected) {
                console.log('Not connected to server, ignoring key press');
                return;
            }
            
            const key = event.key.toLowerCase();
            const directionMap = {
                'arrowup': 'up',
                'arrowdown': 'down', 
                'arrowleft': 'left',
                'arrowright': 'right'
            };
            
            const direction = directionMap[key];
            if (direction && !this.pressedKeys.has(direction)) {
                console.log('Adding direction to pressed keys:', direction);
                this.pressedKeys.add(direction);
                this.sendMoveCommand(direction);
                event.preventDefault(); // Prevent page scrolling
            }
        });
        
        // Handle keyup events
        document.addEventListener('keyup', (event) => {
            if (!this.connected) return;
            
            const key = event.key.toLowerCase();
            const directionMap = {
                'arrowup': 'up',
                'arrowdown': 'down',
                'arrowleft': 'left', 
                'arrowright': 'right'
            };
            
            const direction = directionMap[key];
            if (direction) {
                this.pressedKeys.delete(direction);
                this.checkMovementState();
                event.preventDefault();
            }
        });
        
        // Handle window focus/blur
        window.addEventListener('blur', () => {
            this.pressedKeys.clear();
            this.sendStopCommand();
        });
    }
    
    startAnimationLoop() {
        const animate = (currentTime) => {
            // Update animation frame for moving players
            if (currentTime - this.lastAnimationTime > this.animationSpeed) {
                this.animationFrame = (this.animationFrame + 1) % 3; // Cycle through frames 0, 1, 2
                this.lastAnimationTime = currentTime;
                
                // Redraw if we have players
                if (this.players.size > 0) {
                    this.draw();
                }
            }
            
            // Update greeting rotation every 5 seconds
            if (currentTime - this.greetingTimer > this.greetingInterval) {
                this.currentGreetingIndex = (this.currentGreetingIndex + 1) % this.greetingMessages.length;
                this.greetingTimer = currentTime;
                this.showGreeting = true;
                
                // Hide greeting after 2 seconds
                setTimeout(() => {
                    this.showGreeting = false;
                    if (this.players.size > 0) {
                        this.draw();
                    }
                }, 2000);
                
                // Redraw to show new greeting
                if (this.players.size > 0) {
                    this.draw();
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    connectToServer() {
        try {
            this.socket = new WebSocket('wss://codepath-mmorg.onrender.com');
            
            this.socket.onopen = () => {
                console.log('Connected to game server');
                this.connected = true;
                this.joinGame();
            };
            
            this.socket.onmessage = (event) => {
                this.handleServerMessage(JSON.parse(event.data));
            };
            
            this.socket.onclose = () => {
                console.log('Disconnected from game server');
                this.connected = false;
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
        }
    }
    
    joinGame() {
        if (!this.connected) return;
        
        const joinMessage = {
            action: 'join_game',
            username: 'Saanvi'
        };
        
        this.socket.send(JSON.stringify(joinMessage));
        console.log('Sent join game message');
    }
    
    sendMoveCommand(direction) {
        if (!this.connected) {
            console.log('Cannot send move command - not connected');
            return;
        }
        
        const moveMessage = {
            action: 'move',
            direction: direction
        };
        
        console.log('Sending move command:', moveMessage);
        this.socket.send(JSON.stringify(moveMessage));
        this.isMoving = true;
    }
    
    sendStopCommand() {
        if (!this.connected) return;
        
        const stopMessage = {
            action: 'stop'
        };
        
        this.socket.send(JSON.stringify(stopMessage));
        this.isMoving = false;
    }
    
    checkMovementState() {
        if (this.pressedKeys.size === 0 && this.isMoving) {
            this.sendStopCommand();
        }
    }
    
    handleServerMessage(message) {
        console.log('Received message:', message);
        
        switch (message.action) {
            case 'join_game':
                if (message.success) {
                    this.handleJoinGameResponse(message);
                } else {
                    console.error('Join game failed:', message.error);
                }
                break;
                
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
                
            case 'players_moved':
                this.handlePlayersMoved(message);
                break;
                
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
        }
    }
    
    handleJoinGameResponse(message) {
        this.myPlayerId = message.playerId;
        
        console.log('Join game response:', message);
        
        // Store all players
        for (const [playerId, playerData] of Object.entries(message.players)) {
            this.players.set(playerId, playerData);
            if (playerId === this.myPlayerId) {
                this.myPosition = { x: playerData.x, y: playerData.y };
            }
        }
        
        // Store all avatars
        for (const [avatarName, avatarData] of Object.entries(message.avatars)) {
            this.avatars.set(avatarName, avatarData);
        }
        
        console.log('Total players after join:', this.players.size);
        console.log('Total avatars after join:', this.avatars.size);
        
        // Update viewport to center on our player
        this.updateViewport();
        this.draw();
        
        console.log('Joined game successfully. My position:', this.myPosition);
    }
    
    handlePlayerJoined(message) {
        console.log('Player joined:', message.player.username, 'at position:', message.player.x, message.player.y);
        this.players.set(message.player.id, message.player);
        this.avatars.set(message.avatar.name, message.avatar);
        console.log('Total players now:', this.players.size);
        this.draw();
    }
    
    handlePlayersMoved(message) {
        console.log('Players moved:', Object.keys(message.players).length, 'players');
        for (const [playerId, playerData] of Object.entries(message.players)) {
            this.players.set(playerId, playerData);
            if (playerId === this.myPlayerId) {
                this.myPosition = { x: playerData.x, y: playerData.y };
                this.updateViewport();
            }
        }
        this.draw();
    }
    
    handlePlayerLeft(message) {
        this.players.delete(message.playerId);
        this.draw();
    }
    
    updateViewport() {
        if (!this.myPlayerId) return;
        
        // Center viewport on our player
        this.viewport.x = this.myPosition.x - this.canvas.width / 2;
        this.viewport.y = this.myPosition.y - this.canvas.height / 2;
        
        // Clamp viewport to world bounds
        this.viewport.x = Math.max(0, Math.min(this.viewport.x, this.worldSize - this.canvas.width));
        this.viewport.y = Math.max(0, Math.min(this.viewport.y, this.worldSize - this.canvas.height));
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw world map
        this.drawWorld();
        
        // Draw all players
        this.drawPlayers();
    }
    
    drawWorld() {
        if (this.worldImage.complete) {
            // Draw the visible portion of the world map
            this.ctx.drawImage(
                this.worldImage,
                this.viewport.x, this.viewport.y, this.canvas.width, this.canvas.height,  // Source rectangle
                0, 0, this.canvas.width, this.canvas.height  // Destination rectangle
            );
        } else {
            this.drawPlaceholder();
        }
    }
    
    drawPlayers() {
        console.log('Drawing players. Total players:', this.players.size);
        for (const [playerId, playerData] of this.players) {
            console.log('Drawing player:', playerData.username, 'at position:', playerData.x, playerData.y);
            this.drawPlayer(playerData);
        }
    }
    
    drawPlayer(playerData) {
        const avatar = this.avatars.get(playerData.avatar);
        if (!avatar) {
            console.log('No avatar found for player:', playerData.username, 'avatar name:', playerData.avatar);
            return;
        }
        
        // Calculate screen position
        const screenX = playerData.x - this.viewport.x;
        const screenY = playerData.y - this.viewport.y;
        
        // Only draw if player is visible on screen
        if (screenX < -50 || screenX > this.canvas.width + 50 || 
            screenY < -50 || screenY > this.canvas.height + 50) {
            return;
        }
        
        // Get avatar frame based on facing direction and animation frame
        const direction = playerData.facing;
        
        // Use our local animation frame for smooth animation
        // If player is moving, use animated frame; if idle, use frame 0
        const isPlayerMoving = playerData.isMoving || false;
        const frameIndex = isPlayerMoving ? this.animationFrame : 0;
        
        let frameData;
        if (direction === 'west') {
            // West direction uses flipped east frames
            frameData = avatar.frames.east[frameIndex];
        } else {
            frameData = avatar.frames[direction][frameIndex];
        }
        
        if (frameData) {
            // Create image from base64 data
            const img = new Image();
            img.onload = () => {
                // Calculate avatar size (maintain aspect ratio)
                const maxSize = 32;
                const aspectRatio = img.width / img.height;
                let avatarWidth = maxSize;
                let avatarHeight = maxSize / aspectRatio;
                
                if (aspectRatio < 1) {
                    avatarHeight = maxSize;
                    avatarWidth = maxSize * aspectRatio;
                }
                
                // Add subtle shadow for depth
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.fillRect(screenX - avatarWidth/2 + 2, screenY - avatarHeight + 2, avatarWidth, avatarHeight);
                this.ctx.restore();
                
                // Draw avatar
                this.ctx.save();
                
                if (direction === 'west') {
                    // Flip horizontally for west direction
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(img, -screenX - avatarWidth/2, screenY - avatarHeight, avatarWidth, avatarHeight);
                } else {
                    this.ctx.drawImage(img, screenX - avatarWidth/2, screenY - avatarHeight, avatarWidth, avatarHeight);
                }
                
                this.ctx.restore();
                
                // Draw username label with better styling
                this.drawPlayerLabel(playerData.username, screenX, screenY - avatarHeight - 5);
                
                // Draw greeting message for our player
                if (playerData.id === this.myPlayerId && this.showGreeting) {
                    this.drawGreetingMessage(screenX, screenY - avatarHeight - 25);
                }
            };
            img.onerror = () => {
                console.log('Failed to load avatar image for player:', playerData.username);
            };
            img.src = frameData;
        } else {
            console.log('No frame data for player:', playerData.username, 'direction:', direction, 'frame:', frameIndex);
        }
    }
    
    drawPlayerLabel(username, x, y) {
        this.ctx.save();
        
        // Enhanced label background with rounded corners effect
        const textWidth = this.ctx.measureText(username).width;
        const padding = 6;
        
        // Draw background with gradient effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x - textWidth/2 - padding, y - 18, textWidth + padding * 2, 16);
        
        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - textWidth/2 - padding, y - 18, textWidth + padding * 2, 16);
        
        // Draw text with better styling
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(username, x, y - 10);
        
        this.ctx.restore();
    }
    
    drawGreetingMessage(x, y) {
        this.ctx.save();
        
        const message = this.greetingMessages[this.currentGreetingIndex];
        const textWidth = this.ctx.measureText(message).width;
        const padding = 8;
        
        // Draw speech bubble background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        
        // Rounded rectangle for speech bubble
        const bubbleX = x - textWidth/2 - padding;
        const bubbleY = y - 20;
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 20;
        const radius = 8;
        
        // Draw rounded rectangle manually
        this.ctx.beginPath();
        this.ctx.moveTo(bubbleX + radius, bubbleY);
        this.ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
        this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
        this.ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
        this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
        this.ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
        this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
        this.ctx.lineTo(bubbleX, bubbleY + radius);
        this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw speech bubble tail
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, bubbleY + bubbleHeight);
        this.ctx.lineTo(x, bubbleY + bubbleHeight + 8);
        this.ctx.lineTo(x + 5, bubbleY + bubbleHeight);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw text
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(message, x, y - 10);
        
        this.ctx.restore();
    }
    
    drawPlaceholder() {
        // Draw a placeholder if the world image fails to load
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('World Map Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameClient();
});