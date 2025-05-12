@echo off
echo Stopping all containers...
FOR /f "tokens=*" %%i IN ('docker ps -aq') DO docker stop %%i

echo Removing all containers...
FOR /f "tokens=*" %%i IN ('docker ps -aq') DO docker rm %%i

echo Removing all images...
FOR /f "tokens=*" %%i IN ('docker images -q') DO docker rmi -f %%i

echo Removing all volumes...
FOR /f "tokens=*" %%i IN ('docker volume ls -q') DO docker volume rm %%i

echo Removing all networks...
FOR /f "tokens=*" %%i IN ('docker network ls -q') DO docker network rm %%i

echo Performing final cleanup...
docker system prune -af --volumes

echo Docker cleanup complete!
pause 