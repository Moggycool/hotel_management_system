from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import AccessArea, Role, User


def _active_role_choices():
    return list(Role.objects.filter(is_active=True).values_list('code', 'name'))


class RoleAdminForm(forms.ModelForm):
    access_areas = forms.MultipleChoiceField(
        choices=AccessArea.choices,
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = Role
        fields = '__all__'

    def clean_code(self):
        code = self.cleaned_data['code'].upper().replace('-', '_')
        if self.instance.pk and code != self.instance.code:
            raise forms.ValidationError('The role code cannot be changed.')
        return code


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    form = RoleAdminForm
    list_display = ('name', 'code', 'is_builtin', 'is_active')
    list_filter = ('is_builtin', 'is_active')
    search_fields = ('name', 'code')

    def get_readonly_fields(self, request, obj=None):
        if obj is None:
            return ()
        if obj.is_builtin:
            return ('code', 'access_areas')
        return ('code',)

    def has_delete_permission(self, request, obj=None):
        if obj is not None:
            if obj.is_builtin or User.objects.filter(role=obj.code).exists():
                return False
        return super().has_delete_permission(request, obj)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role_name',
                    'phone_number', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'full_name', 'phone_number')
    ordering = ('full_name',)

    @admin.display(description='Staff Role')
    def role_name(self, obj):
        return obj.get_role_display()

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'role':
            return forms.ChoiceField(
                label=db_field.verbose_name,
                choices=_active_role_choices,
                initial=db_field.default,
            )
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'phone_number')}),
        ('Permissions & Role', {'fields': (
            'role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Security & Audit', {'fields': ('is_mfa_enabled',
         'last_login', 'created_at', 'updated_at')}),
    )

    readonly_fields = ('created_at', 'updated_at', 'last_login')

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )
