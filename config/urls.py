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
# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from apps.accounts.auth_views import current_user
from apps.properties.views import CurrentPropertyConfigView

urlpatterns = [
    path('', RedirectView.as_view(url='/admin/', permanent=False), name='home'),
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
]
