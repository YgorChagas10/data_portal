# Build stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Instalar dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 