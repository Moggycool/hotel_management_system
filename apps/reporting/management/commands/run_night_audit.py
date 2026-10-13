from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import StaffRole
from apps.reporting.views import NightAuditViewSet


class Command(BaseCommand):
    help = 'Execute the same audited night-close workflow used by the REST API.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date', type=date.fromisoformat, default=date.today())
        parser.add_argument('--user-email', required=True,
                            help='Existing authorized night-audit staff email.')
        parser.add_argument(
            '--auditor', help='Display name recorded as the closing auditor.')
        parser.add_argument('--notes', default='')
        parser.add_argument('--skip-no-shows', action='store_false',
                            dest='process_no_shows', default=True)

    def handle(self, *args, **options):
        user_model = get_user_model()
        try:
            user = user_model.objects.get(
                email=options['user_email'], is_active=True)
        except user_model.DoesNotExist as exc:
            raise CommandError(
                'No active staff account exists for that email.') from exc

        allowed_roles = {
            StaffRole.GENERAL_MANAGER,
            StaffRole.FRONT_OFFICE_MANAGER,
            StaffRole.FINANCE_OFFICER,
            StaffRole.CASHIER,
            StaffRole.SYSTEM_ADMIN,
        }
        if not (user.is_superuser or user.role in allowed_roles):
            raise CommandError(
                'The selected account is not authorized to run night audit.')

        business_date = options['date']
        request = APIRequestFactory().post(
            '/api/v1/reporting/night-audit/execute/',
            {
                'business_date': business_date.isoformat(),
                'closed_by': options.get('auditor') or user.full_name,
                'auditor_role': user.get_role_display(),
                'notes': options.get('notes', ''),
                'process_no_shows': options['process_no_shows'],
            },
            format='json',
        )
        force_authenticate(request, user=user)
        response = NightAuditViewSet.as_view(
            {'post': 'execute_night_audit'})(request)

        if response.status_code >= 400:
            raise CommandError(
                str(getattr(response, 'data', 'Night audit failed.')))

        report = response.data['session']
        self.stdout.write(self.style.SUCCESS(response.data['message']))
        self.stdout.write(
            f"  - Occupancy: {report['occupancy_rate']}% ({report['occupied_rooms']}/{report['total_rooms']} rooms)")
        self.stdout.write(
            f"  - Room revenue: {report['room_revenue_etb']} ETB")
        self.stdout.write(
            f"  - Gross revenue: {report['gross_revenue_etb']} ETB")
        self.stdout.write(f"  - Audit checksum: {report['audit_checksum']}")
        if response.data.get('already_closed'):
            self.stdout.write(self.style.WARNING(
                'This date was already closed; no new charges were posted.'))
