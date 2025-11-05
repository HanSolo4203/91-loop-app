-- Migration: Update linen_categories with RSL Express pricing data
-- This migration adds a section column and replaces all existing linen categories with RSL pricing data

-- First, add the section column to linen_categories table
ALTER TABLE linen_categories ADD COLUMN section text;

-- Clear existing data (since we're replacing with RSL pricing)
DELETE FROM linen_categories;

-- Insert Front of House items
INSERT INTO linen_categories (name, price_per_item, section, is_active) VALUES
('Napkins', 2.73, 'Front of House', true),
('Waiter Aprons', 4.40, 'Front of House', true),
('Waiter Bibs', 4.40, 'Front of House', true),
('Round Tablecloths - Small', 5.28, 'Front of House', true),
('Round Tablecloths - Medium', 5.72, 'Front of House', true),
('Round Tablecloths - Large', 6.50, 'Front of House', true),
('Tablecloths - Small', 5.28, 'Front of House', true),
('Tablecloths - Medium', 5.72, 'Front of House', true),
('Tablecloths - Large', 6.60, 'Front of House', true),
('Overlays - Small', 5.28, 'Front of House', true),
('Overlays - Medium', 5.72, 'Front of House', true),
('Overlays - Large', 6.60, 'Front of House', true),
('Overlays - Extra Large', 7.74, 'Front of House', true);

-- Insert Kitchen items
INSERT INTO linen_categories (name, price_per_item, section, is_active) VALUES
('Chefs Jackets', 5.81, 'Kitchen', true),
('Chefs Trousers', 5.81, 'Kitchen', true),
('Chefs Aprons', 5.37, 'Kitchen', true),
('Chefs T-Shirts', 4.66, 'Kitchen', true),
('Kitchen Cloths', 4.40, 'Kitchen', true);

-- Insert Housekeeping items
INSERT INTO linen_categories (name, price_per_item, section, is_active) VALUES
('Pillow Cases - Continental (Square)', 5.10, 'Housekeeping', true),
('Pillow Cases - Standard', 4.84, 'Housekeeping', true),
('Fitted Sheet - King', 10.30, 'Housekeeping', true),
('Fitted Sheet - Queen', 9.06, 'Housekeeping', true),
('Fitted Sheet - Double', 8.10, 'Housekeeping', true),
('Fitted Sheet - 3/4', 7.92, 'Housekeeping', true),
('Fitted Sheet - Single', 6.60, 'Housekeeping', true),
('Fitted Sheet - Cot', 5.37, 'Housekeeping', true),
('Flat Sheet - King', 10.30, 'Housekeeping', true),
('Flat Sheet - Queen', 9.06, 'Housekeeping', true),
('Flat Sheet - Double', 8.10, 'Housekeeping', true),
('Flat Sheet - 3/4', 7.92, 'Housekeeping', true),
('Flat Sheet - Single', 6.60, 'Housekeeping', true),
('Flat Sheet - Cot', 5.37, 'Housekeeping', true),
('Duvet Covers - King', 15.31, 'Housekeeping', true),
('Duvet Covers - Queen', 13.38, 'Housekeeping', true),
('Duvet Covers - Double', 11.44, 'Housekeeping', true),
('Duvet Covers - Single', 9.50, 'Housekeeping', true),
('Duvet Covers - Cot', 7.57, 'Housekeeping', true),
('Towels - Extra Large', 15.05, 'Housekeeping', true),
('Towels - Pool Towel', 15.05, 'Housekeeping', true),
('Towels - Bath Sheet', 10.56, 'Housekeeping', true),
('Towels - Bath Towel', 8.62, 'Housekeeping', true),
('Towels - Hand Towel', 6.60, 'Housekeeping', true),
('Towels - Gym Towel', 6.60, 'Housekeeping', true),
('Towels - Face Cloth', 3.78, 'Housekeeping', true),
('Towels - Head Band', 3.08, 'Housekeeping', true),
('Bath Mats', 12.81, 'Housekeeping', true),
('Spa Gown', 15.75, 'Housekeeping', true),
('Blanket', 11.80, 'Housekeeping', true),
('Cushion Cover', 11.62, 'Housekeeping', true),
('Curtain', 145.20, 'Housekeeping', true),
('Duvet Inner - King', 48.40, 'Housekeeping', true),
('Duvet Inner - Single', 29.04, 'Housekeeping', true);
