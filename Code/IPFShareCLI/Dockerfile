FROM node:18
# switch to bash
SHELL ["/bin/bash", "-c"]
RUN apt-get update && apt-get install openssh-client
# Install pnpm
RUN npm install -g pnpm
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
# Clone the repository
RUN git clone https://github.com/nicocossiom/IPFShare.git /app

# Set the working directory
WORKDIR /app/Code/IPFShareCLI

# Remove existing pnpm lock file if present
RUN rm pnpm-lock.yaml

# Install dependencies using pnpm
RUN pnpm install

# Build the project
RUN pnpm run build

# Install the application globally
RUN pnpm install . -g

CMD ["pnpm", "start"]
