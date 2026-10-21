from rest_framework.permissions import BasePermission
from apps.accounts.models import StaffRole


class HasRole(BasePermission):
    """
    Checks if authenticated user possesses one of the allowed roles.
    """
    allowed_roles = []
    area = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == StaffRole.SYSTEM_ADMIN or request.user.is_superuser:
            return True
        if request.user.role in self.allowed_roles:
            return True
        return self.area is not None and self.area in request.user.role_access_areas()


class IsGeneralManager(HasRole):
    allowed_roles = [StaffRole.GENERAL_MANAGER]


class IsFrontOfficeStaff(HasRole):
    area = 'front_office'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.RECEPTIONIST,
        StaffRole.CASHIER,
    ]


class IsReservationRoomAssignmentStaff(HasRole):
    area = 'reservation_assignment'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.RECEPTIONIST,
    ]


class IsRoomManagementStaff(HasRole):
    area = 'room_management'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.RECEPTIONIST,
    ]


class IsFinanceStaff(HasRole):
    area = 'finance'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FINANCE_OFFICER,
        StaffRole.CASHIER,
    ]


class IsHousekeepingStaff(HasRole):
    area = 'housekeeping'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.HOUSEKEEPING_SUPERVISOR,
        StaffRole.HOUSEKEEPER,
    ]


class IsNightAuditStaff(HasRole):
    area = 'night_audit'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.FINANCE_OFFICER,
        StaffRole.CASHIER,
    ]


class IsRestaurantStaff(HasRole):
    area = 'restaurant'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.WAITER,
        StaffRole.EXECUTIVE_CHEF,
        StaffRole.CASHIER,
    ]


class IsRestaurantSettlementStaff(HasRole):
    area = 'restaurant_settlement'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.CASHIER,
        StaffRole.FINANCE_OFFICER,
    ]


class IsRestaurantMenuManager(HasRole):
    area = 'restaurant_menu'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
    ]


class IsInventoryStaff(HasRole):
    area = 'inventory'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.STOREKEEPER,
        StaffRole.PURCHASING_OFFICER,
        StaffRole.EXECUTIVE_CHEF,
    ]


class IsRecipeManager(HasRole):
    area = 'recipes'
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.EXECUTIVE_CHEF,
    ]
