from urllib.parse import quote
from flask import url_for
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import RDF, RDFS
from bs4 import BeautifulSoup

# Define name spaces
BASE = Namespace('http://www.example.org/test#')
DFD = Namespace('https://w3id.org/dfd/')


def export_dfd(dfd):
    # Collect all items in DFD
    entities, processes, datastores, dataflows = collect_items(dfd)

    # Create turtle RDF
    rdf_graph = create_rdf_graph(entities, processes, datastores, dataflows)
    turtle = rdf_graph.serialize(format='turtle').decode()
    return turtle


def collect_items(hierarchy):
    # Set items records
    entities = set()    # Entity names
    processes = {}      # Process name (key) and parent name or None (value)
    datastores = set()  # Datastore names
    dataflows = set()   # Tuples in the form (flow name, source name, target name)

    # Is sub process
    parent = None if hierarchy['title'] == 'Context diagram' else hierarchy['title']

    # Collect items in graph
    graph = BeautifulSoup(hierarchy['xml_model'], 'lxml')

    for entity in graph.find_all('entity'):
        if not entity.get('from_parent'):
            entities.add(entity.get('label'))

    for process in graph.find_all('process'):
        if not process.get('from_parent'):
            processes[process.get('label')] = parent

    for datastore in graph.find_all('datastore'):
        if not datastore.get('from_parent'):
            datastores.add(datastore.get('label'))

    for flow in graph.find_all('mxcell', {"item_type": "flow"}):
        label = flow.get('value')
        source = graph.find(attrs={'id': flow.get('source')}).get('label')
        target = graph.find(attrs={'id': flow.get('target')}).get('label')
        dataflows.add((label, source, target))

    # Collect items in sub processes and merge them
    for child in hierarchy['children']:
        _, sub_processes, sub_datastores, sub_dataflows = collect_items(child)
        processes.update(sub_processes)
        datastores.update(sub_datastores)
        dataflows.update(sub_dataflows)

    return entities, processes, datastores, dataflows


def create_rdf_graph(entities, processes, datastores, dataflows):
    # Create graph
    graph = Graph()

    # Bind prefix names
    graph.bind('dfd', DFD)

    # Define Entities
    for entity in entities:
        graph.add((BASE[quote(entity)], RDF.type, DFD.Interface))
        graph.add((BASE[quote(entity)], RDFS.label, Literal(entity)))

    # Define Datastores
    for datastore in datastores:
        graph.add((BASE[quote(datastore)], RDF.type, DFD.DataStore))
        graph.add((BASE[quote(datastore)], RDFS.label, Literal(datastore)))

    # Define Processes
    for process, parent in processes.items():
        graph.add((BASE[quote(process)], RDF.type, DFD.Process))
        graph.add((BASE[quote(process)], RDFS.label, Literal(process)))
        if parent:
            graph.add(
                (BASE[quote(process)], DFD.subProcessOf, BASE[quote(parent)]))

    # Define DataFlows
    for i, (label, source, target) in enumerate(dataflows):
        graph.add((BASE[f'f{i}'], RDF.type, DFD.DataFlow))
        graph.add((BASE[f'f{i}'], RDFS.label, Literal(label)))
        graph.add((BASE[f'f{i}'], DFD['from'], BASE[quote(source)]))
        graph.add((BASE[f'f{i}'], DFD.to, BASE[quote(target)]))

    return graph
