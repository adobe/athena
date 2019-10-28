#!/usr/bin/env sh
sysctl -w net.ipv4.conf.eth0.route_localnet=1
sysctl -w net.ipv4.ip_forward=1

function prerouting {
    iptables -t nat -A PREROUTING -p tcp --dport 80:3999 -j REDIRECT --to-port 8080
    iptables -t nat -A PREROUTING -p tcp --dport 4001:65535 -j REDIRECT --to-port 8080
    iptables -A INPUT -j ACCEPT
    iptables -A FORWARD -j ACCEPT
}

function postrouting {
    iptables --match multiport -t nat -A OUTPUT -p tcp --dports 80,443 -j DNAT --to-destination 127.0.0.1:9191
}

postrouting
iptables-save