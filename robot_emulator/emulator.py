import json
import time
import random
import requests
from datetime import datetime
import os
try:
    import socketio
except Exception:
    socketio = None

class RobotEmulator:
    def __init__(self, robot_id, api_url):
        self.robot_id = robot_id
        self.api_url = api_url
        # Первый робот стартует с низким зарядом для теста уведомлений
        self.battery = 15 if robot_id == "RB-001" else 100
        self.current_zone = 'A'
        self.current_row = 1
        self.current_shelf = 1

        # Список тестовых товаров
        self.products = [
            {"id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"id": "TEL-8901", "name": "Модем DSL-2640U"},
            {"id": "TEL-2345", "name": "Коммутатор SG-108"},
            {"id": "TEL-6789", "name": "IP-телефон T46S"},
            {"id": "TEL-3456", "name": "Кабель UTP Cat6"}
        ]
        self.sio = None
        self.paused = False
        if socketio is not None:
            try:
                self.sio = socketio.Client()
                @self.sio.event
                def connect():
                    print(f"[{self.robot_id}] Socket connected")
                @self.sio.on('robot_command')
                def on_robot_command(data):
                    rid = data.get('robotId')
                    if rid and rid != self.robot_id:
                        return
                    t = data.get('type')
                    if t == 'pause':
                        self.paused = True
                    elif t == 'resume':
                        self.paused = False
                    elif t == 'rescan':
                        z = data.get('zone')
                        r = data.get('row')
                        s = data.get('shelf')
                        if z and r and s:
                            self.current_zone = z
                            self.current_row = int(r)
                            self.current_shelf = int(s)
                self.sio.connect(api_url.replace('http', 'ws'), transports=['websocket'])
            except Exception as e:
                print(f"[{self.robot_id}] Socket connection failed: {e}")

    def generate_scan_data(self):
        """Генерация данных сканирования"""
        scanned_products = random.sample(self.products, k=random.randint(1, 3))
        scan_results = []

        for product in scanned_products:
            quantity = random.randint(5, 100)
            status = "OK" if quantity > 20 else ("LOW_STOCK" if quantity > 10 else "CRITICAL")

            scan_results.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "status": status
            })

        return scan_results

    def move_to_next_location(self):
        """Перемещение робота к следующей локации"""
        self.current_shelf += 1
        if self.current_shelf > 10:
            self.current_shelf = 1
            self.current_row += 1
            if self.current_row > 20:
                self.current_row = 1
                # Переход к следующей зоне
                self.current_zone = chr(ord(self.current_zone) + 1)
                if ord(self.current_zone) > ord('E'):
                    self.current_zone = 'A'

        # Расход батареи
        self.battery -= random.uniform(0.1, 0.5)
        # Не сбрасываем батарею, чтобы проверить уведомления о низком заряде
        # if self.battery < 20:
        #     self.battery = 100  # Симуляция зарядки

    def send_data(self):
        """Отправка данных на сервер"""
        data = {
            "robot_id": self.robot_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "location": {
                "zone": self.current_zone,
                "row": self.current_row,
                "shelf": self.current_shelf
            },
            "scan_results": self.generate_scan_data(),
            "battery_level": round(self.battery, 1),
            "next_checkpoint": f"{self.current_zone}-{self.current_row+1}-{self.current_shelf}"
        }

        # Узнаем глобальный режим
        mode = 'http'
        try:
            cfg = requests.get(f"{self.api_url}/api/config/transport-mode", timeout=3).json()
            mode = cfg.get('mode') or 'http'
        except Exception:
            pass

        if mode == 'socket' and self.sio is not None:
            try:
                self.sio.emit('robot_data', data)
                print(f"[{self.robot_id}] Data sent via socket")
                return
            except Exception as e:
                print(f"[{self.robot_id}] Socket send error: {e}")

        # fallback HTTP
        try:
            response = requests.post(
                f"{self.api_url}/api/robots/data",
                json=data,
                headers={
                    "Authorization": f"Bearer robot_token_{self.robot_id}",
                    "Content-Type": "application/json"
                }
            )
            if response.status_code == 200:
                print(f"[{self.robot_id}] Data sent via HTTP")
            else:
                print(f"[{self.robot_id}] HTTP error: {response.status_code}")
        except Exception as e:
            print(f"[{self.robot_id}] HTTP connection error: {e}")

    def run(self):
        """Основной цикл работы робота"""
        while True:
            # Получаем следующую задачу (пауза/возобновление/перескан)
            try:
                task_resp = requests.get(f"{self.api_url}/api/robots/{self.robot_id}/tasks/next", timeout=5)
                if task_resp.status_code == 200:
                    task_json = task_resp.json() or {}
                    task = task_json.get('task')
                    if task:
                        tid = task.get('id')
                        payload = task.get('payload') or {}
                        if tid == 'pause' or task.get('type') == 'pause':
                            self.paused = True
                        elif tid == 'resume' or task.get('type') == 'resume':
                            self.paused = False
                        elif tid == 'rescan' or task.get('type') == 'rescan':
                            z = payload.get('zone') or payload.get('targetZone')
                            r = payload.get('row') or payload.get('targetRow')
                            s = payload.get('shelf') or payload.get('targetShelf')
                            if z and r and s:
                                self.current_zone = z
                                self.current_row = int(r)
                                self.current_shelf = int(s)
                        elif tid == 'move' or task.get('type') == 'move':
                            payload_zone = payload.get('zone') or payload.get('targetZone')
                            payload_row = payload.get('row') or payload.get('targetRow')
                            payload_shelf = payload.get('shelf') or payload.get('targetShelf')
                            if payload_zone and payload_row and payload_shelf:
                                self.current_zone = payload_zone
                                self.current_row = int(payload_row)
                                self.current_shelf = int(payload_shelf)
                                print(f"[{self.robot_id}] move: goto {self.current_zone}-{self.current_row}-{self.current_shelf}")
            except Exception as e:
                print(f"[{self.robot_id}] Task poll error: {e}")

            if self.paused:
                time.sleep(2)
                continue

            self.send_data()
            self.move_to_next_location()
            time.sleep(int(os.getenv('UPDATE_INTERVAL', 10)))

if __name__ == "__main__":
    api_url = os.getenv('API_URL', 'http://localhost:3000')
    robots_count = int(os.getenv('ROBOTS_COUNT', 5))

    # Запуск эмуляторов роботов
    import threading

    for i in range(1, robots_count + 1):
        robot = RobotEmulator(f"RB-{i:03d}", api_url)
        thread = threading.Thread(target=robot.run)
        thread.daemon = True
        thread.start()

    # Держим главный поток активным
    while True:
        time.sleep(60)