INSERT INTO public.packages (name, animal_key, emoji, price_kes, daily_income_kes, cycle_days, total_profit_kes, is_free, display_order) VALUES
('Starter Duck', 'duck', '🦆', 0, 20, 10, 200, true, 1),
('Rabbit Hutch', 'rabbit', '🐇', 500, 30, 30, 900, false, 2),
('Laying Hen', 'hen', '🐔', 1000, 60, 30, 1800, false, 3),
('Dairy Goat', 'goat', '🐐', 2500, 150, 30, 4500, false, 4),
('Wool Sheep', 'sheep', '🐑', 5000, 300, 30, 9000, false, 5),
('Fattening Pig', 'pig', '🐖', 10000, 620, 30, 18600, false, 6),
('Dairy Cow', 'cow', '🐄', 20000, 1250, 30, 37500, false, 7),
('Working Donkey', 'donkey', '🫏', 35000, 2200, 30, 66000, false, 8),
('Desert Camel', 'camel', '🐪', 50000, 3200, 30, 96000, false, 9),
('Riding Horse', 'horse', '🐎', 75000, 4900, 30, 147000, false, 10),
('Prize Bull', 'bull', '🐂', 100000, 6700, 30, 201000, false, 11)
ON CONFLICT (name) DO NOTHING;