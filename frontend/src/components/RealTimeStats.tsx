import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { BatteryStd, SmartToy, Warning, Inventory } from '@mui/icons-material';
import { useSpring, animated } from '@react-spring/web';

interface Statistics {
  activeRobots: number;
  totalRobots: number;
  scannedToday: number;
  criticalStock: number;
  avgBattery: number;
}

interface RealTimeStatsProps {
  statistics: Statistics;
}

const RealTimeStats: React.FC<RealTimeStatsProps> = ({ statistics }) => {
  // Защита от undefined
  const statsData = statistics || {
    activeRobots: 0,
    totalRobots: 0,
    scannedToday: 0,
    criticalStock: 0,
    avgBattery: 0
  };

  const stats = [
    {
      icon: <SmartToy color="primary" />,
      label: 'Активных роботов',
      value: `${statsData.activeRobots}/${statsData.totalRobots}`,
      color: '#2196f3'
    },
    {
      icon: <Inventory color="secondary" />,
      label: 'Проверено сегодня',
      value: statsData.scannedToday.toString(),
      color: '#9c27b0'
    },
    {
      icon: <Warning color="error" />,
      label: 'Критических остатков',
      value: statsData.criticalStock.toString(),
      color: '#f44336'
    },
    {
      icon: <BatteryStd color="success" />,
      label: 'Средний заряд',
      value: `${statsData.avgBattery}%`,
      color: '#4caf50',
      progress: statsData.avgBattery
    }
  ];

  const containerAnimation = useSpring({
    height: 'auto',
    opacity: 1,
    config: { tension: 200, friction: 20 }
  });

  const AnimatedBox = animated(Box as any);

  return (
    <AnimatedBox style={{ ...containerAnimation, overflow: 'hidden' }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Статистика в реальном времени
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {stats.map((stat, index) => (
          <Box key={index} sx={{ textAlign: 'center', p: 1 }}>
            <Box sx={{ color: stat.color, mb: 1 }}>
              {stat.icon}
            </Box>
            <Typography variant="h5" fontWeight="bold" color={stat.color}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {stat.label}
            </Typography>
            {stat.progress !== undefined && (
              <LinearProgress 
                variant="determinate" 
                value={stat.progress} 
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color={
                  stat.progress > 70 ? 'success' :
                  stat.progress > 30 ? 'warning' : 'error'
                }
              />
            )}
          </Box>
        ))}
      </Box>
      </Paper>
    </AnimatedBox>
  );
};

export default RealTimeStats;