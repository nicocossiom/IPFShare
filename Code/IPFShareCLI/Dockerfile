FROM node:18

# use bash instead of sh
SHELL ["/bin/bash", "-c"]

# Create a new directory for the app
WORKDIR /app/

# Copy the rest of the app's source code
COPY . .

# Install dependencies using pnpm
RUN yarn install

RUN yarn build

RUN yarn run build

RUN yarn start setup /app/ipfshare
ENV IPFSHARE_HOME=/app/ipfshare
CMD /bin/bash
