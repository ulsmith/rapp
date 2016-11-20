FROM node:latest

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Add and Install
ADD ./assets assets
COPY ./package.json package.json
COPY ./server.js server.js

# Install Deps (only really need proxy polyfill but no bother leave package js as is for dev purposes!)
RUN npm install

EXPOSE 80
CMD ["npm", "start"]
