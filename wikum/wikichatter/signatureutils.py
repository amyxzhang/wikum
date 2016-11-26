import re
import mwparserfromhell as mwp
from .error import Error


class SignatureUtilsError(Error):
    pass


class NoUsernameError(SignatureUtilsError):
    pass


class NoTimestampError(SignatureUtilsError):
    pass


class NoSignature(SignatureUtilsError):
    pass


# 01:52, 20 September 2013 (UTC)
_TIMESTAMP_RE_0 = r"[0-9]{2}:[0-9]{2}, [0-9]{1,2} [^\W\d]+ [0-9]{4} \(UTC\)"
# 18:45 Mar 10, 2003 (UTC)
_TIMESTAMP_RE_1 = r"[0-9]{2}:[0-9]{2} [^\W\d]+ [0-9]{1,2}, [0-9]{4} \(UTC\)"
# 01:54:53, 2005-09-08 (UTC)
_TIMESTAMP_RE_2 = r"[0-9]{2}:[0-9]{2}:[0-9]{2}, [0-9]{4}-[0-9]{2}-[0-9]{2} \(UTC\)"
_TIMESTAMPS = [_TIMESTAMP_RE_0, _TIMESTAMP_RE_1, _TIMESTAMP_RE_2]
TIMESTAMP_RE = re.compile(r'|'.join(_TIMESTAMPS))

USER_RE = re.compile(r"(\[\[\W*user\W*:(.*?)\|[^\]]+\]\])", re.I)
USER_TALK_RE = re.compile(r"(\[\[\W*user[_ ]talk\W*:(.*?)\|[^\]]+\]\])", re.I)
USER_CONTRIBS_RE = re.compile(r"(\[\[\W*Special:Contributions/(.*?)\|[^\]]+\]\])", re.I)


def extract_signatures(wcode):
    """
    Returns all signatures found in the text as a list of dictionaries
    [
        {'user':<username>,
         'timestamp':<timestamp_as_string>,
         'wikicode':<signature text>}
    ]
    """
    nodes = wcode.nodes
    signature_list = []
    signature_loc = _find_signatures_in_nodes(nodes)
    for (start, end) in signature_loc:
        sig_code = mwp.wikicode.Wikicode(nodes[start:end + 1])
        signature = _extract_signature_dict_from_sig_code(sig_code)
        signature_list.append(signature)
    return signature_list


def _extract_signature_dict_from_sig_code(sig_code):
    signature = {}
    signature['user'] = _extract_rightmost_user(sig_code)
    signature['timestamp'] = _extract_timestamp_from_sig_code(sig_code)
    signature['wikicode'] = sig_code
    return signature


def _find_signatures_in_nodes(nodes):
    result = []
    candidate_locations = _find_timestamp_locations(nodes)
    for loc in candidate_locations:
        start, end = _find_signature_near_timestamp(loc, nodes)
        if start is not None:
            result.append((start, end))
    return result


def _find_timestamp_locations(nodes):
    locations = []
    for i, node in enumerate(nodes):
        if _node_has_timestamp(node):
            locations.append(i)
    return locations


def _find_signature_near_timestamp(timestamp_loc, nodes):
    end = timestamp_loc
    start = _find_start_of_signature_ending_at(end, nodes)
    if start is None:
        start = end
        end = _find_end_of_backwards_signature_starting_at(start, nodes)
    if end is None:
        start = None
    return start, end


def _divide_wikicode_on_timestamps(wcode):
    nodes = wcode.nodes
    divided_nodes = _divide_nodes_on_timestamp(nodes)
    return [mwp.wikicode.Wikicode(ns) for ns in divided_nodes]


def _divide_nodes_on_timestamp(nodes):
    divided = []
    locations = _find_timestamp_locations(nodes)
    start = 0
    for loc in locations:
        end = loc + 1
        cur = nodes[start:end]
        divided.append(cur)
        start = end
    if end > len(nodes):
        last = nodes[start:]
        divided.append(last)
    return divided


def _find_start_of_signature_ending_at(end, nodes):
    start = None
    found_user = False
    found_date = False
    for i in range(0, 6):
        cur = end - i
        if cur < 0 or cur >= len(nodes):
            break
        node = nodes[cur]
        n_has_un = _node_contains_username(node)
        found_user = found_user or n_has_un
        n_has_ts = _node_has_timestamp(node)

        if n_has_ts and found_date:
            break
        found_date = found_date or n_has_ts

        if n_has_un or n_has_ts:
            start = cur
        elif len(str(node)) > 5 and (found_user and found_date):
            break
    if not (found_user and found_date):
        start = None
    return start


def _find_end_of_backwards_signature_starting_at(start, nodes):
    end = None
    found_user = False
    found_date = False
    for i in range(0, 6):
        cur = start + i
        if cur >= len(nodes):
            break
        node = nodes[cur]
        n_has_un = _node_contains_username(node)
        found_user = found_user or n_has_un

        n_has_ts = _node_has_timestamp(node)
        if n_has_ts and found_date:
            break
        found_date = found_date or n_has_ts

        if n_has_un or n_has_ts:
            end = cur
        elif len(str(node)) > 5 and (found_user and found_date):
            break
    if not (found_user and found_date):
        end = None
    return end


def _find_next_endline(text, position):
    endlines = [i for i, letter in enumerate(text) if letter == '\n']
    candidates = [i for i in endlines if i >= position]
    candidates.append(len(text))
    return min(candidates)


def _extract_rightmost_timestamp(wcode):
    nodes = wcode.nodes
    ts_loc = _find_timestamp_locations(nodes)
    if len(ts_loc) == 0:
        raise NoTimestampError(text)
    return mwp.wikicode.Wikicode(nodes[ts_loc[-1]])


def _extract_rightmost_user(wcode):
    text = str(wcode)
    up_locs = _find_userpage_locations(text)
    ut_locs = _find_usertalk_locations(text)
    uc_locs = _find_usercontribs_location(text)

    func_picker = [(l[0], l[1], _extract_userpage_user) for l in up_locs]
    func_picker.extend([(l[0], l[1], _extract_usertalk_user) for l in ut_locs])
    func_picker.extend([(l[0], l[1], _extract_usercontribs_user) for l in uc_locs])

    if len(func_picker) == 0:
        raise NoUsernameError(text)
    (start, end, extractor) = max(func_picker, key=lambda e: e[1])
    user = extractor(text[start:end])
    return user


def _extract_userpage_user(text):
    up = USER_RE.match(text)
    if up is None:
        raise NoUsernameError(text)
    raw_username = up.group(2)
    return _clean_extracted_username(raw_username)


def _extract_usertalk_user(text):
    ut = USER_TALK_RE.match(text)
    if ut is None:
        raise NoUsernameError(text)
    raw_username = ut.group(2)
    return _clean_extracted_username(raw_username)


def _extract_usercontribs_user(text):
    uc = USER_CONTRIBS_RE.match(text)
    if uc is None:
        raise NoUsernameError(text)
    raw_username = uc.group(2)
    return _clean_extracted_username(raw_username)


def _extract_timestamp_from_sig_code(sig_code):
    text = str(sig_code)
    result = re.findall(TIMESTAMP_RE, text)
    if len(result) == 0:
        raise NoTimestampError(text)
    return result[0]


def _clean_extracted_username(raw_username):
    parts = re.split('#|/', raw_username)
    username = parts[0]
    return username.strip()


def _node_has_timestamp(node):
    return _node_matches_regex(node, TIMESTAMP_RE)


def _node_is_part_of_signature(node):
    return (_node_contains_username(node) or
            _node_has_timestamp(node))


def _node_contains_username(node):
    wcode = mwp.wikicode.Wikicode([node])
    links = [l for l in wcode.filter_wikilinks()]
    for link in links:
        if (_node_is_usertalk(link) or _node_is_userpage(link) or _node_is_usercontribs(link)):
            return True
    return False


def _node_is_usertalk(node):
    return _node_matches_regex(node, USER_TALK_RE)


def _node_is_userpage(node):
    return _node_matches_regex(node, USER_RE)


def _node_is_usercontribs(node):
    return _node_matches_regex(node, USER_CONTRIBS_RE)


def _node_matches_regex(node, regex):
    text = str(node)
    return re.search(regex, text) is not None


def _find_userpage_locations(text):
    return _find_regex_locations(USER_RE, text)


def _find_usertalk_locations(text):
    return _find_regex_locations(USER_TALK_RE, text)


def _find_usercontribs_location(text):
    return _find_regex_locations(USER_CONTRIBS_RE, text)


def _find_regex_locations(regex, text):
    regex_iter = regex.finditer(text)
    return [m.span() for m in regex_iter]
