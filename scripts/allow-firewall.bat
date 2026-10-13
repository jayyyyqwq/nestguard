@echo off
rem Lets NestGuard sensor boxes on the local network reach this laptop.
rem Needs administrator rights: setup.bat runs it for you with a Yes/No prompt.
rem
rem   TCP 8000  backend API (boxes post readings here)
rem   TCP 3000  dashboard (open it from a phone on the same Wi-Fi)
rem   UDP 47800 box discovery (boxes ask "where is NestGuard?")
rem
rem remoteip=localsubnet: only devices on the same Wi-Fi/LAN, never the internet.
rem profile=any: Windows 11 marks new Wi-Fi networks "Public" by default, which
rem would otherwise silently block the boxes on a friend's network.

netsh advfirewall firewall delete rule name="NestGuard" >nul 2>&1
netsh advfirewall firewall add rule name="NestGuard" dir=in action=allow protocol=TCP localport=8000,3000 remoteip=localsubnet profile=any >nul || exit /b 1
netsh advfirewall firewall add rule name="NestGuard" dir=in action=allow protocol=UDP localport=47800 remoteip=localsubnet profile=any >nul || exit /b 1
exit /b 0
