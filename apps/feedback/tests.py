import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.feedback.models import GuestFeedback


@pytest.fixture
def feedback_staff(db):
    cache.clear()
    manager = User.objects.create_user(
        email='feedback-manager@example.et', password='StrongPassword#2026',
        full_name='Feedback Manager', role=StaffRole.GENERAL_MANAGER,
    )
    front_office_manager = User.objects.create_user(
        email='feedback-fom@example.et', password='StrongPassword#2026',
        full_name='Front Office Manager', role=StaffRole.FRONT_OFFICE_MANAGER,
    )
    receptionist = User.objects.create_user(
        email='feedback-reception@example.et', password='StrongPassword#2026',
        full_name='Feedback Receptionist', role=StaffRole.RECEPTIONIST,
    )
    return manager, front_office_manager, receptionist


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_guest_can_submit_feedback_and_only_managers_can_review(feedback_staff):
    manager, front_office_manager, receptionist = feedback_staff
    guest_client = APIClient()
    response = guest_client.post(
        '/api/v1/feedback/',
        {
            'rating': 5,
            'category': 'SERVICE',
            'message': 'The front desk team was welcoming and very helpful.',
            'guest_name': 'Optional Guest Name',
            'reservation_code': 'WEB-ABCDEFGH',
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    feedback = GuestFeedback.objects.get(pk=response.data['id'])
    assert feedback.status == 'NEW'
    assert feedback.guest_name == 'Optional Guest Name'

    assert guest_client.get('/api/v1/feedback/').status_code == 401
    assert authenticated_client(receptionist).get(
        '/api/v1/feedback/').status_code == 403

    manager_client = authenticated_client(manager)
    list_response = manager_client.get('/api/v1/feedback/')
    assert list_response.status_code == 200
    assert len(list_response.data) == 1

    update_response = manager_client.patch(
        f'/api/v1/feedback/{feedback.id}/',
        {'status': 'RESOLVED', 'staff_notes': 'Thanked the guest and briefed the team.'},
        format='json',
    )
    assert update_response.status_code == 200, update_response.data
    feedback.refresh_from_db()
    assert feedback.status == 'RESOLVED'
    assert feedback.staff_notes == 'Thanked the guest and briefed the team.'
    assert feedback.reviewed_by == manager
    assert feedback.reviewed_at is not None
    assert AuditLog.objects.filter(
        action='GUEST_FEEDBACK_REVIEWED').count() == 1

    front_office_response = authenticated_client(
        front_office_manager).get('/api/v1/feedback/')
    assert front_office_response.status_code == 200


@pytest.mark.django_db
def test_feedback_validates_rating_and_message():
    client = APIClient()
    short_message = client.post(
        '/api/v1/feedback/',
        {'rating': 5, 'category': 'STAY', 'message': 'Short'},
        format='json',
    )
    assert short_message.status_code == 400

    invalid_rating = client.post(
        '/api/v1/feedback/',
        {'rating': 6, 'category': 'STAY', 'message': 'This rating is out of range.'},
        format='json',
    )
    assert invalid_rating.status_code == 400
    assert GuestFeedback.objects.count() == 0
