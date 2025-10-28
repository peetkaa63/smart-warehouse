import json
import time
import random
import requests
from datetime import datetime
import os

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
                print(f"[{self.robot_id}] Data sent successfully")
            else:
                print(f"[{self.robot_id}] Error: {response.status_code}")
        except Exception as e:
            print(f"[{self.robot_id}] Connection error: {e}")

    def run(self):
        """Основной цикл работы робота"""
        while True:
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