FROM mongo:7

# Create a data directory (Fly will mount volume here)
VOLUME /data/db

CMD ["mongod", "--bind_ip_all"]
