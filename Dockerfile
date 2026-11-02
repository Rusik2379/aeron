FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
RUN mkdir -p /var/lib/aeron assets/uploads && chown -R node:node /app /var/lib/aeron
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4186 AERON_DATA_DIR=/var/lib/aeron
EXPOSE 4186
CMD ["node", "docker-start.mjs"]
