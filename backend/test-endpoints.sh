#!/bin/bash
# Test script for production-ready endpoints

BASE_URL="http://localhost:5000"

echo "🧪 Testing Production Endpoints"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing GET /health"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/health" | head -20
echo ""

# Test 2: Section Content - famille_categories
echo "2️⃣ Testing GET /api/sectionContent?sectionType=famille_categories"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/sectionContent?sectionType=famille_categories"
echo ""
echo ""

# Test 3: Section Content - promotions
echo "3️⃣ Testing GET /api/sectionContent?sectionType=promotions"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/sectionContent?sectionType=promotions"
echo ""
echo ""

# Test 4: Login
echo "4️⃣ Testing POST /api/auth/login"
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin123@exe.com","password":"admin123"}' \
  -w "\nStatus: %{http_code}\n"
echo ""
echo ""

echo "✅ Tests completed!"

