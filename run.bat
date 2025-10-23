@echo off
chcp 65001 >nul
echo ================================
echo   Memos 笔记管理系统 - 启动器
echo ================================
echo.
echo 正在启动 PHP 内置服务器...
echo.
echo 🚀 访问地址:
echo   主页面: http://localhost:8080/
echo   安装页: http://localhost:8080/install.php
echo   重置页: http://localhost:8080/reset.php
echo.
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

php -S localhost:8080

pause
