import json
import time
import random
import requests
from datetime import datetime
import os
from robot_factory import RobotFactory

def send_data(robot):
    """Отправка данных на сервер"""
    data = {
        "robot_id": robot.robot_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "location": {
            "zone": robot.current_zone,
            "row": robot.current_row,
            "shelf": robot.current_shelf
        },
        "scan_results": robot.generate_scan_data(),
        "battery_level": round(robot.battery, 1),
        "next_checkpoint": f"{robot.current_zone}-{robot.current_row+1}-{robot.current_shelf}",
        "robot_type": robot.__class__.__name__.lower().replace('robot', '')
    }

    try:
        response = requests.post(
            f"{robot.api_url}/api/robots/data",
            json=data,
            headers={
                "Authorization": f"Bearer robot_token_{robot.robot_id}",
                "Content-Type": "application/json"
            }
        )
        if response.status_code == 200:
            print(f"[{robot.robot_id}] Data sent successfully")
        else:
            print(f"[{robot.robot_id}] Server error: {response.status_code}")
    except Exception as e:
        print(f"[{robot.robot_id}] Connection error: {e}")

def run_robot(robot):
    """Основной цикл работы робота"""
    while True:
        send_data(robot)
        robot.move_to_next_location()
        time.sleep(int(os.getenv('UPDATE_INTERVAL', 10)))

if __name__ == "__main__":
    api_url = os.getenv('API_URL', 'http://localhost:3000')
    
    # Конфигурация флота роботов через Factory
    robot_configs = [
        {'type': 'scanning', 'id': 'SCAN', 'count': 3},
        {'type': 'transport', 'id': 'TRANS', 'count': 2},
        {'type': 'inspection', 'id': 'INSP', 'count': 1}
    ]
    
    # Создание флота роботов через Factory
    robots = RobotFactory.create_robot_fleet(robot_configs, api_url)
    
    print(f"🤖 Created {len(robots)} robots:")
    for robot in robots:
        print(f"  - {robot.robot_id} ({robot.__class__.__name__})")
    
    # Запуск эмуляторов роботов
    import threading
    
    for robot in robots:
        thread = threading.Thread(target=run_robot, args=(robot,))
        thread.daemon = True
        thread.start()
        print(f"🚀 Started {robot.robot_id}")

    # Держим главный поток активным
    while True:
        time.sleep(60)

