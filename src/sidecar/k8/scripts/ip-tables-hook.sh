#!/usr/bin/env sh
sysctl -w net.ipv4.conf.eth0.route_localnet=1
sysctl -w net.ipv4.ip_forward=1

prerouting() {
    iptables -t nat -A PREROUTING -p tcp --dport 80:3999 -j REDIRECT --to-port 9191
    iptables -t nat -A PREROUTING -p tcp --dport 4001:65535 -j REDIRECT --to-port 9191
    iptables -A INPUT -j ACCEPT
    iptables -A FORWARD -j ACCEPT
}

postrouting() {
    sudo iptables --match multiport -t nat -A OUTPUT -p tcp -m owner ! --uid-owner sidecar --dports 80,443 -j REDIRECT --to-ports 9191
}

postrouting
sudo iptables-save