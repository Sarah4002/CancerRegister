from django.contrib.auth import get_user_model


class UserFactory:
    """Factory Method qui valide le rôle et délègue la création au manager Django."""

    @staticmethod
    def create_user(*, role=None, **attributes):
        user_model = get_user_model()
        selected_role = role or user_model.Role.READONLY
        valid_roles = {value for value, _label in user_model.Role.choices}
        if selected_role not in valid_roles:
            raise ValueError(f"Rôle utilisateur inconnu : {selected_role}")
        return user_model.objects.create_user(role=selected_role, **attributes)
