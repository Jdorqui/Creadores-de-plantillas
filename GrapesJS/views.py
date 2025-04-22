from django.template.loader import render_to_string
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def render_factura(request):
    plantilla = request.GET.get('plantilla', 'fv_141')
    context = {}  # Aquí puedes cargar datos reales si lo deseas
    try:
        html = render_to_string(f'facturas/{plantilla}.html', context)
        return JsonResponse({'html': html})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
