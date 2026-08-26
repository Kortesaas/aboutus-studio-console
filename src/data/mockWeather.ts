export const mockWeather = {
  location: 'Berlin',
  temperature: 18,
  condition: 'Partly cloudy',
  feelsLike: 17,
  humidity: 64,
  wind: '11 km/h SW',
  rainProbability: 20,
  hourly: [
    { time: 'Now', temperature: 18, condition: 'partly-cloudy' },
    { time: '22:00', temperature: 17, condition: 'cloudy' },
    { time: '23:00', temperature: 16, condition: 'cloudy' },
    { time: '00:00', temperature: 15, condition: 'clear' },
    { time: '01:00', temperature: 14, condition: 'clear' },
    { time: '02:00', temperature: 14, condition: 'clear' },
  ],
} as const
