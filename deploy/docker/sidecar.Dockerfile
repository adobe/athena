FROM envoyproxy/envoy

RUN apt update -y \
    && apt -y upgrade \
    && apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates \
    && curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt -y install nodejs \
    && apt -y install sudo \
    && apt -y install iptables

RUN adduser --disabled-password --disabled-login --gecos "" sidecar && echo "sidecar:sidecar" | chpasswd && adduser sidecar sudo
RUN echo "sidecar ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
USER sidecar

WORKDIR /etc/app
COPY . .
RUN sudo npm install

# TODO: Fix this.
EXPOSE 5000-5100

CMD ["sudo", "npm", "run", "create-cluster"]