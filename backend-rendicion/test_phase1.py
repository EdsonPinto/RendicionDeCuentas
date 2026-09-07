import urllib.request
import urllib.parse
import json
import base64

print("=" * 80)
print("PRUEBAS DE CONFIGURACIÓN CENTRALIZADA - FASE 1")
print("=" * 80)

token = None

# Test 1: Login
print("\nTest 1: Verificar autenticación JWT")
print("-" * 80)
try:
    data = urllib.parse.urlencode({'username': 'admin@palacio.gov.co', 'password': 'admin123'}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/token', data=data)
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    
    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode('utf-8'))
        print('✅ Token generado correctamente')
        print(f'   Token: {result["access_token"][:30]}...')
        print(f'   Token Type: {result["token_type"]}')
        token = result['access_token']
except Exception as e:
    print(f'❌ Error al generar token: {e}')

if token:
    # Test 2: Usar el token para GET /api/me
    print("\nTest 2: Verificar validación de token")
    print("-" * 80)
    try:
        req = urllib.request.Request('http://localhost:8000/api/me')
        req.add_header('Authorization', f'Bearer {token}')
        
        with urllib.request.urlopen(req, timeout=5) as response:
            user = json.loads(response.read().decode('utf-8'))
            print('✅ Token validado correctamente')
            print(f'   Usuario: {user["nombre"]}')
            print(f'   Rol: {user["rol"]}')
    except Exception as e:
        print(f'❌ Error validando token: {e}')

    # Test 3: Verificar que admin endpoints requieren autenticación
    print("\nTest 3: Verificar autenticación requerida")
    print("-" * 80)
    try:
        req = urllib.request.Request('http://localhost:8000/api/admin/usuarios')
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f'⚠️ Unexpected: debería requerir autenticación')
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print('✅ Endpoint /api/admin/usuarios requiere autenticación')
        else:
            print(f'⚠️ Status code: {e.code}')
    except Exception as e:
        print(f'⚠️ Error: {e}')

    # Test 4: Verificar que admin endpoints funcionan con token
    print("\nTest 4: Verificar validación de rol")
    print("-" * 80)
    try:
        req = urllib.request.Request('http://localhost:8000/api/admin/usuarios')
        req.add_header('Authorization', f'Bearer {token}')
        
        with urllib.request.urlopen(req, timeout=5) as response:
            users = json.loads(response.read().decode('utf-8'))
            print('✅ Endpoint /api/admin/usuarios funciona con rol admin')
            print(f'   Total usuarios en sistema: {len(users)}')
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print('❌ Usuario no tiene rol admin')
        else:
            print(f'⚠️ Status code: {e.code}')
    except Exception as e:
        print(f'⚠️ Error: {e}')

print("\n" + "=" * 80)
print("PRUEBAS COMPLETADAS")
print("=" * 80)
