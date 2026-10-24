"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from pathlib import Path
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from django.http import FileResponse, HttpResponse
from django.views.static import serve as static_serve
from apps.accounts.auth_views import current_user
from apps.properties.views import CurrentPropertyConfigView


def serve_spa(request):
    index_file = settings.BASE_DIR / 'dist' / 'index.html'
    if index_file.exists():
        return FileResponse(open(index_file, 'rb'), content_type='text/html')

    html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Staff Portal | Arbaminch Tourist Hotel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem 1rem; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 620px; width: 100%; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #f1f5f9; margin-top: 0; font-size: 1.6rem; }
    .badge { background: #047857; color: #a7f3d0; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .info { background: #0f172a; border-left: 4px solid #10b981; padding: 1rem; border-radius: 4px; margin: 1.25rem 0; font-size: 0.95rem; line-height: 1.5; color: #cbd5e1; }
    .steps { background: #0f172a; padding: 1rem 1.25rem; border-radius: 8px; margin: 1rem 0; font-family: monospace; font-size: 0.9rem; color: #38bdf8; line-height: 1.6; }
    .btn { display: inline-block; background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem; margin-right: 0.5rem; margin-top: 0.5rem; }
    .btn:hover { background: #10b981; }
    .btn-secondary { background: #334155; color: #f8fafc; }
    .btn-secondary:hover { background: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; }
    code { background: #0f172a; padding: 0.15rem 0.35rem; border-radius: 4px; color: #fde047; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Arbaminch Tourist Hotel</span>
    <h1>🏨 Staff & Management Portal</h1>
    <p style="color: #94a3b8; font-size: 0.95rem;">The Django backend server is running successfully on Render.</p>
    
    <div class="info">
      <strong>Why you see this page:</strong><br>
      The compiled React frontend bundle (<code>dist/index.html</code>) was not found on this Render deployment because <code>dist/</code> was previously in <code>.gitignore</code>.
    </div>

    <div class="steps">
      <strong>Quick 2-Step Fix to enable the React Staff PMS on Render:</strong><br><br>
      1. Run in your local terminal:<br>
      <span style="color: #4ade80;">npm run build</span><br><br>
      2. Commit and push the built frontend:<br>
      <span style="color: #4ade80;">git add dist/ build.sh .gitignore config/</span><br>
      <span style="color: #4ade80;">git commit -m "Deploy compiled React frontend to Render"</span><br>
      <span style="color: #4ade80;">git push origin main</span>
    </div>

    <p style="color: #cbd5e1; font-size: 0.9rem; margin-top: 1.5rem;">
      In the meantime, you can log in to the <strong>Django Staff & Admin site</strong> right now:
    </p>

    <div style="margin: 1.25rem 0;">
      <a class="btn" href="/admin/">Open Django Admin Site &rarr;</a>
      <a class="btn btn-secondary" href="/api/v1/properties/current/">View Current Hotel API &rarr;</a>
    </div>

    <h3 style="color: #e2e8f0; margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1rem;">Default Staff Credentials:</h3>
    <table>
      <thead>
        <tr><th>Role</th><th>Email</th><th>Password</th></tr>
      </thead>
      <tbody>
        <tr><td>General Manager</td><td><code>gm@arbaminchhotel.et</code></td><td><code>ArbaHotel#2026</code></td></tr>
        <tr><td>Front Desk</td><td><code>fom@arbaminchhotel.et</code></td><td><code>ArbaHotel#2026</code></td></tr>
        <tr><td>Receptionist</td><td><code>reception@arbaminchhotel.et</code></td><td><code>ArbaHotel#2026</code></td></tr>
        <tr><td>Cashier</td><td><code>cashier@arbaminchhotel.et</code></td><td><code>ArbaHotel#2026</code></td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>"""
    return HttpResponse(html, content_type='text/html')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/me/', current_user, name='current-user'),
    path('api/v1/properties/current/', CurrentPropertyConfigView.as_view(),
         name='current-property-config'),
    path('api/v1/rooms/', include('apps.rooms.urls')),
    path('api/v1/reservations/', include('apps.reservations.urls')),
    path('api/v1/guests/', include('apps.guests.urls')),
    path('api/v1/billing/', include('apps.billing.urls')),
    path('api/v1/housekeeping/', include('apps.housekeeping.urls')),
    path('api/v1/restaurant/', include('apps.restaurant.urls')),
    path('api/v1/kitchen/', include('apps.kitchen.urls')),
    path('api/v1/inventory/', include('apps.inventory.urls')),
    path('api/v1/reporting/', include('apps.reporting.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    path('api/v1/feedback/', include('apps.feedback.urls')),
    path('assets/<path:path>', static_serve,
         {'document_root': settings.BASE_DIR / 'dist' / 'assets'}),
    path('hotel-hero.jpg', static_serve,
         {'document_root': settings.BASE_DIR / 'dist', 'path': 'hotel-hero.jpg'}),
    path('staff/', serve_spa, name='staff'),
    path('staff', serve_spa, name='staff-no-slash'),
    path('', serve_spa, name='home'),
]
