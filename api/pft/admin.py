from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    Category, Transaction, Budget, User,
)

class TransactionAdminForm(forms.ModelForm):
    amount = forms.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model = Transaction
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['amount'].initial = self.instance.amount

    def save(self, commit=True):
        instance = super().save(commit=False)
        amount = self.cleaned_data.get('amount')
        if amount is not None:
            instance.amount = str(amount)
        if commit:
            instance.save()
        return instance

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin"""
    list_display = ('email', 'first_name', 'last_name', 'phone_number', 'department', 'role', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone_number', 'location', 'bio')}),
        ('Organization', {'fields': ('department', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'department', 'role'),
        }),
    )

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    form = TransactionAdminForm
    list_display = ('title', 'amount', 'type', 'user', 'category', 'transaction_date')
    search_fields = ('title', 'user__email')
    list_filter = ('type', 'category', 'user')

admin.site.register(Category)
admin.site.register(Budget)

admin.site.site_header = "FinTrack Admin"
admin.site.site_title = "FinTrack Admin Portal"
admin.site.index_title = "Welcome to FinTrack Financial Management Portal"
