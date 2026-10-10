from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
import uuid
from apps.guests.models import Guest
from apps.reservations.models import Reservation, ReservationStatus
from apps.rooms.models import Room, RatePlan


class ReservationCreateApiView(APIView):
    def post(self, request):
        data = request.data
        try:
            with transaction.atomic():
                # 1. Get or create guest
                guest, _ = Guest.objects.get_or_create(
                    email=data.get('guest_email'),
                    defaults={
                        'full_name': data.get('guest_name'),
                        'phone_number': data.get('guest_phone', ''),
                        'id_number': data.get('id_number', ''),
                        'id_type': data.get('id_type', 'FAYDA').upper(),
                    }
                )

                # 2. Match physical room
                room = Room.objects.filter(
                    room_number=data.get('room_number')).first()
                if room is None:
                    return Response({'error': 'Room not found.'}, status=status.HTTP_400_BAD_REQUEST)
                rate_plan = RatePlan.objects.filter(is_active=True).first()

                # 3. Create Reservation
                res = Reservation.objects.create(
                    confirmation_code=f"GH-{uuid.uuid4().hex[:6].upper()}",
                    guest=guest,
                    room=room,
                    rate_plan=rate_plan,
                    check_in_date=data.get('check_in_date'),
                    check_out_date=data.get('check_out_date'),
                    adults=data.get('adults', 1),
                    children=data.get('children', 0),
                    status=ReservationStatus.CONFIRMED,
                    room_rate_total_etb=data.get('room_rate_total_etb', 0),
                    vat_etb=data.get('vat_etb', 0),
                    service_charge_etb=data.get('service_charge_etb', 0),
                    grand_total_etb=data.get('grand_total_etb', 0),
                    deposit_paid_etb=data.get('deposit_paid_etb', 0),
                    special_requests=data.get('special_requests', ''),
                )

                return Response({'id': res.id, 'confirmation_code': res.confirmation_code}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
