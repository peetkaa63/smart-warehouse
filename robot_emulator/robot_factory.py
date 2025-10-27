from abc import ABC, abstractmethod
from typing import Dict, Any
import random
import time
from datetime import datetime

# Базовый интерфейс для всех роботов
class RobotInterface(ABC):
    @abstractmethod
    def generate_scan_data(self) -> list:
        pass
    
    @abstractmethod
    def move_to_next_location(self) -> None:
        pass
    
    @abstractmethod
    def send_data(self) -> None:
        pass
    
    @abstractmethod
    def run(self) -> None:
        pass

# Базовый класс робота
class BaseRobot(RobotInterface):
    def __init__(self, robot_id: str, api_url: str):
        self.robot_id = robot_id
        self.api_url = api_url
        self.battery = 100
        self.current_zone = 'A'
        self.current_row = 1
        self.current_shelf = 1
        self.status = 'active'
    
    def move_to_next_location(self) -> None:
        """Базовая логика движения"""
        self.current_shelf += 1
        if self.current_shelf > 10:
            self.current_shelf = 1
            self.current_row += 1
            if self.current_row > 20:
                self.current_row = 1
                self.current_zone = chr(ord(self.current_zone) + 1)
                if ord(self.current_zone) > ord('E'):
                    self.current_zone = 'A'
        
        # Расход батареи
        self.battery -= random.uniform(0.1, 0.5)
        if self.battery < 20:
            self.battery = 100  # Симуляция зарядки

# Специализированные типы роботов
class ScanningRobot(BaseRobot):
    """Робот для сканирования товаров"""
    
    def __init__(self, robot_id: str, api_url: str):
        super().__init__(robot_id, api_url)
        self.products = [
            {"id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"id": "TEL-8901", "name": "Модем DSL-2640U"},
            {"id": "TEL-2345", "name": "Коммутатор SG-108"},
            {"id": "TEL-6789", "name": "IP-телефон T46S"},
            {"id": "TEL-3456", "name": "Кабель UTP Cat6"}
        ]
    
    def generate_scan_data(self) -> list:
        """Генерация данных сканирования для сканирующих роботов"""
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

class TransportRobot(BaseRobot):
    """Робот для транспортировки товаров"""
    
    def __init__(self, robot_id: str, api_url: str):
        super().__init__(robot_id, api_url)
        self.carrying_capacity = 50
        self.current_load = 0
    
    def generate_scan_data(self) -> list:
        """Генерация данных для транспортных роботов"""
        # Транспортные роботы сканируют меньше товаров, но с большими количествами
        products = [
            {"id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"id": "TEL-8901", "name": "Модем DSL-2640U"}
        ]
        
        scanned_products = random.sample(products, k=random.randint(1, 2))
        scan_results = []
        
        for product in scanned_products:
            quantity = random.randint(20, 200)  # Больше товаров
            status = "OK" if quantity > 50 else ("LOW_STOCK" if quantity > 25 else "CRITICAL")
            
            scan_results.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "status": status,
                "transport_type": "bulk"
            })
        
        return scan_results

class InspectionRobot(BaseRobot):
    """Робот для инспекции качества"""
    
    def __init__(self, robot_id: str, api_url: str):
        super().__init__(robot_id, api_url)
        self.inspection_accuracy = 0.95
    
    def generate_scan_data(self) -> list:
        """Генерация данных для роботов инспекции"""
        products = [
            {"id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"id": "TEL-8901", "name": "Модем DSL-2640U"},
            {"id": "TEL-2345", "name": "Коммутатор SG-108"},
            {"id": "TEL-6789", "name": "IP-телефон T46S"},
            {"id": "TEL-3456", "name": "Кабель UTP Cat6"}
        ]
        
        scanned_products = random.sample(products, k=random.randint(2, 4))
        scan_results = []
        
        for product in scanned_products:
            quantity = random.randint(1, 50)
            # Инспекционные роботы чаще находят проблемы
            quality_issues = random.random() < 0.1  # 10% вероятность проблем
            status = "DEFECTIVE" if quality_issues else ("OK" if quantity > 10 else "LOW_STOCK")
            
            scan_results.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "status": status,
                "inspection_quality": self.inspection_accuracy,
                "defects_found": quality_issues
            })
        
        return scan_results

# Factory для создания роботов
class RobotFactory:
    """Фабрика для создания различных типов роботов"""
    
    ROBOT_TYPES = {
        'scanning': ScanningRobot,
        'transport': TransportRobot,
        'inspection': InspectionRobot
    }
    
    @staticmethod
    def create_robot(robot_type: str, robot_id: str, api_url: str) -> RobotInterface:
        """Создание робота определенного типа"""
        if robot_type not in RobotFactory.ROBOT_TYPES:
            raise ValueError(f"Unknown robot type: {robot_type}")
        
        robot_class = RobotFactory.ROBOT_TYPES[robot_type]
        return robot_class(robot_id, api_url)
    
    @staticmethod
    def create_robot_fleet(robot_configs: list, api_url: str) -> list:
        """Создание флота роботов на основе конфигурации"""
        robots = []
        
        for config in robot_configs:
            robot_type = config.get('type', 'scanning')
            robot_id = config.get('id')
            count = config.get('count', 1)
            
            for i in range(count):
                full_robot_id = f"{robot_id}-{i+1:03d}" if count > 1 else robot_id
                robot = RobotFactory.create_robot(robot_type, full_robot_id, api_url)
                robots.append(robot)
        
        return robots
    
    @staticmethod
    def get_available_types() -> list:
        """Получение списка доступных типов роботов"""
        return list(RobotFactory.ROBOT_TYPES.keys())

