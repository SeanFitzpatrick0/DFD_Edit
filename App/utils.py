from App.models import User, DataFlowDiagram, Invitation


def get_user_created_diagrams(user):
    created_diagrams = DataFlowDiagram.query.filter_by(author=user.id)
    return created_diagrams


def get_user_invited_diagrams(user):
    user_invites = Invitation.query.filter_by(invited_user=user.id)
    invited_diagrams = [DataFlowDiagram.query.get(
        invite.invited_to) for invite in user_invites]
    return invited_diagrams


def get_diagram_editors(diagram):
    diagram_invitations = Invitation.query.filter_by(invited_to=diagram.id)
    editors = [User.query.get(invitation.invited_user)
               for invitation in diagram_invitations]
    return editors
